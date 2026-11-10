"""Real HTTP + SMTP/Mailpit acceptance. Creates uniquely named test accounts in the selected stack.
No mocks, no direct database writes, no test token endpoint. Run against a disposable database.
Environment: MIDCV_API_URL, MIDCV_MAILPIT_URL, MIDCV_ADMIN_EMAIL, MIDCV_ADMIN_PASSWORD.
AI provider quality / upload OCR are intentionally outside this deterministic suite.
"""
import base64, json, os, re, secrets, time, uuid
from pathlib import Path
from urllib.request import Request, build_opener, ProxyHandler
from urllib.error import HTTPError
from urllib.parse import quote

class LiveAcceptance:
    def __init__(self):
        self.api=os.environ.get('MIDCV_API_URL','http://localhost:8080').rstrip('/')
        self.mail=os.environ.get('MIDCV_MAILPIT_URL','http://localhost:8025').rstrip('/')
        self.http=build_opener(ProxyHandler({}));self.results=[];self.context={}
        self.tag='midcv-live-'+uuid.uuid4().hex[:10]
        self.password=secrets.token_urlsafe(22)+'Aa9!'
    def request(self,path,body=None,token=None,method=None,expected=(200,),raw=None,content_type=None,base=None):
        headers={}
        if token:headers['Authorization']='Bearer '+token
        if raw is None and body is not None:raw=json.dumps(body).encode();content_type='application/json'
        if content_type:headers['Content-Type']=content_type
        req=Request((base or self.api)+path,data=raw,headers=headers,method=method or ('POST' if raw is not None else 'GET'))
        try:
            with self.http.open(req,timeout=45) as response:status=response.status;data=response.read()
        except HTTPError as e:status=e.code;data=e.read()
        assert status in expected,f'{method or req.method} {path}: HTTP {status}, expected {expected}; {data[:260].decode(errors="replace")}'
        try:return json.loads(data)
        except ValueError:return data
    def check(self,name,condition=True):
        assert condition,name;self.results.append({'case':name,'status':'PASS'});print('PASS | '+name,flush=True)
    def login(self,email,role):
        return self.request('/api/v1/auth/login',{'email':email,'password':self.password,'expectedRole':role})['data']
    def verify(self,email):
        deadline=time.monotonic()+25
        while time.monotonic()<deadline:
            messages=self.request('/api/v1/messages',base=self.mail).get('messages',[])
            found=next((m for m in messages if any(t.get('Address')==email for t in m.get('To',[]))),None)
            if found:
                detail=self.request('/api/v1/message/'+found['ID'],base=self.mail)
                text=detail.get('Text','')+' '+detail.get('HTML','')
                match=re.search(r'[?&]token=([^\s<>"&]+)',text)
                if match:
                    token=match.group(1);self.request('/api/v1/auth/verify-email',{'token':token});return token
            time.sleep(.3)
        raise AssertionError('Không nhận được thư xác minh SMTP trong Mailpit: '+email)
    def register(self,kind):
        email=self.tag+'-'+kind+'@example.test'
        data={'email':email,'password':self.password,'fullName':'MidCV Live '+kind}
        if kind.startswith('hr'):data.update(companyName='MidCV Live Company '+kind,companyTaxCode='0123456789',companyAddress='Địa chỉ kiểm thử tích hợp',phone='0901234567')
        route='recruiter' if kind.startswith('hr') else 'candidate'
        response=self.request('/api/v1/auth/register/'+route,data,expected=(201,))
        assert not response['data'].get('devVerificationToken'),'SMTP must not disclose verification tokens'
        return email
    def multipart(self,path,token,data,name='license.png',mime='image/png',expected=(200,)):
        boundary='midcv-'+uuid.uuid4().hex
        body=(f'--{boundary}\r\nContent-Disposition: form-data; name="file"; filename="{name}"\r\nContent-Type: {mime}\r\n\r\n').encode()+data+f'\r\n--{boundary}--\r\n'.encode()
        return self.request(path,token=token,raw=body,content_type='multipart/form-data; boundary='+boundary,expected=expected)
    def run(self):
        admin_email=os.environ['MIDCV_ADMIN_EMAIL'];admin_password=os.environ['MIDCV_ADMIN_PASSWORD']
        admin=self.request('/api/v1/auth/login',{'email':admin_email,'password':admin_password,'expectedRole':'ADMIN'})['data']['accessToken']
        email=self.register('candidate')
        self.request('/api/v1/auth/login',{'email':email,'password':self.password},expected=(403,401,400))
        self.check('Unverified email cannot log in; SMTP response hides token')
        used=self.verify(email)
        self.request('/api/v1/auth/verify-email',{'token':used},expected=(400,401,403))
        candidate=self.login(email,'CANDIDATE');ct=candidate['accessToken']
        self.check('Real Mailpit message activates account; token is single-use')
        self.request('/api/v1/auth/login',{'email':email,'password':self.password,'expectedRole':'HR'},expected=(403,401,400))
        self.check('Candidate account rejected by employer login portal')
        account=self.request('/api/v1/inbox/account',token=ct)['data'];self.check('Verified candidate tier is derived from persisted account',account['candidate_tier']=='VERIFIED')
        self.request('/api/v1/admin/users/'+candidate['userId']+'/plan',{'plan':'PRO'},admin,method='PUT')
        account=self.request('/api/v1/inbox/account',token=ct)['data'];self.check('Admin plan upgrade changes candidate tier to PRO',account['candidate_tier']=='PRO')
        hr_email=self.register('hr');self.verify(hr_email);hr=self.login(hr_email,'HR');ht=hr['accessToken']
        company=self.request('/api/v1/recruiter/company',token=ht)['data'];company_id=company['id']
        self.check('HR registration persists representative phone, tax code and address',company['contactPhone']=='0901234567' and company['taxCode']=='0123456789' and bool(company['address']))
        self.request('/api/v1/recruiter/company',{'description':'Giới thiệu doanh nghiệp kiểm thử','descriptionHtml':'<p><strong>midCV live</strong></p>'},ht,method='PUT')
        stored=self.request('/api/v1/recruiter/company',token=ht)['data'];self.check('Company introduction is independent of verification notes',stored['descriptionHtml']=='<p><strong>midCV live</strong></p>' and stored.get('reviewNotes') is None)
        self.request('/api/v1/recruiter/company/submit-verification',{},ht,expected=(400,403))
        self.check('Company cannot request approval without business license')
        png=base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j6JkAAAAASUVORK5CYII=')
        self.multipart('/api/v1/recruiter/company/business-license',ht,b'not-a-png',expected=(400,))
        self.multipart('/api/v1/recruiter/company/business-license',ht,png)
        self.request('/api/v1/recruiter/company/submit-verification',{},ht)
        self.request('/api/v1/admin/companies/'+company_id+'/verification/start-review',{'reason':'Live acceptance review'},admin)
        self.request('/api/v1/admin/companies/'+company_id+'/verification/approve',{'reason':'Live fixture license and contact checked'},admin)
        downloaded=self.request('/api/v1/admin/companies/'+company_id+'/business-license',token=admin)
        self.check('License content verified, stored, downloaded and approved',downloaded==png)
        self.request('/api/v1/admin/companies/'+company_id+'/business-license',token=ct,expected=(403,))
        self.check('Candidate cannot access private business license')
        jd={'title':'Java Backend live acceptance','industry':'Technology','seniority':'Junior','employmentType':'FULL_TIME','location':'Hồ Chí Minh','description':'Phát triển Java và Spring Boot APIs với PostgreSQL.','descriptionHtml':'<h2>Phát triển phần mềm</h2><p><b>Java</b> và Spring Boot</p>','candidateRequirements':'<ul><li>Hiểu REST API</li></ul>','benefitsContent':'<p>Đào tạo chuyên môn</p>','workAddress':'<p>Hồ Chí Minh</p>','workingTime':'<p>Thứ 2–6, 08:30–17:30</p>','applicationInstructions':'<p>Nộp hồ sơ qua midCV</p>','applicationDeadline':'2099-12-31','occupationCodes':['2512','MIDCV_IT_001'],'requirements':[{'skillName':'Java','type':'REQUIRED','minYearsExp':0}]}
        wrong=dict(jd,occupationCodes=['INVENTED']);self.request('/api/v1/jobs/draft',wrong,ht,expected=(400,));self.check('Server rejects occupation codes outside sourced catalog')
        jobs=[]
        for i in range(6):
            j=self.request('/api/v1/jobs/draft',dict(jd,title=jd['title']+' '+str(i)),ht,expected=(201,))['data'];jobs.append(j)
            self.request('/api/v1/jobs/'+j['id']+'/publish',{},ht,expected=(200,) if i<5 else (403,400))
        public=self.request('/api/v1/jobs/'+jobs[0]['id'])['data']
        self.check('JD rich sections, occupations, company introduction round-trip',public['descriptionHtml']==jd['descriptionHtml'] and public['candidateRequirements']==jd['candidateRequirements'] and public['workingTime']==jd['workingTime'] and public['occupationCodes']==jd['occupationCodes'] and public['companyDescriptionHtml']==stored['descriptionHtml'])
        self.check('Level 2 enforces five active postings on backend')
        campaign=self.request('/api/v1/recruiter/campaigns',{'name':'Chiến dịch live','notes':'API persistence','status':'ACTIVE','jobIds':[jobs[0]['id']]},ht)['data']['id']
        self.request('/api/v1/recruiter/campaigns/'+campaign,{'name':'Chiến dịch đã sửa','notes':'updated','status':'PAUSED','jobIds':[jobs[0]['id'],jobs[1]['id']]},ht,method='PUT')
        campaigns=self.request('/api/v1/recruiter/campaigns',token=ht)['data'];self.check('Campaign create/update/list persists owned job links',campaigns[0]['job_count']==2 and campaigns[0]['status']=='PAUSED')
        hr2_email=self.register('hr2');self.verify(hr2_email);hr2=self.login(hr2_email,'HR');h2=hr2['accessToken']
        self.request('/api/v1/recruiter/campaigns',{'name':'Cross company forbidden','notes':'','status':'ACTIVE','jobIds':[jobs[0]['id']]},h2,expected=(403,400))
        self.request('/api/v1/recruiter/campaigns/'+campaign,{'name':'Forbidden','notes':'','status':'ACTIVE','jobIds':[]},h2,method='PUT',expected=(404,403))
        self.check('Campaign links and updates enforce company ownership')
        cv=self.request('/api/v1/candidate/cvs',{'title':'CV live','creationPath':'BUILDER','targetIndustry':'Technology','isDefault':True},ct,expected=(201,))['data']['id']
        presentation={'template':'creative','photo':'data:image/png;base64,'+base64.b64encode(png).decode(),'font':'Georgia','fontSize':15,'lineHeight':1.7,'accent':'#176b58','sectionOrder':['education','projects','experience','certifications','languages'],'hiddenSections':[]}
        draft={'title':'CV Live with photo','personal_info':{'full_name':'MidCV Live Candidate','email':email,'phone':'0901234567'},'summary':{'text':'Java Backend developer with experience building Spring Boot APIs and PostgreSQL systems.'},'skills':[{'name':'Java'},{'name':'Spring Boot'}],'work_experience':[],'projects':[{'name':'REST API project','description':'Implemented Java Spring Boot API using PostgreSQL.'}],'education':[],'certifications':[],'languages':[],'presentation':presentation}
        self.request('/api/v1/candidate/cvs/'+cv+'/draft',draft,ct,method='PUT')
        draft_back=self.request('/api/v1/candidate/cvs/'+cv+'/draft',token=ct)['data'];self.check('CV template/photo/font/order persist on exact draft',draft_back['presentation']==presentation)
        bad=dict(draft,presentation={'photo':'data:image/svg+xml;base64,Zm9v'});self.request('/api/v1/candidate/cvs/'+cv+'/draft',bad,ct,method='PUT',expected=(400,));self.check('Server rejects SVG or invalid CV photo data')
        self.request('/api/v1/candidate/cvs/'+cv+'/confirm',{},ct)
        a0=self.request('/api/v1/candidate/applications',{'jobId':jobs[0]['id'],'cvId':cv,'aiAnalysisConsent':False,'coverLetter':'Thư giới thiệu live'},ct,expected=(201,))['data']
        self.check('Opt-out application succeeds without any match score',a0['aiAnalysisConsent'] is False and a0['matchScore'] is None and a0['matchStatus']=='CONSENT_NOT_GIVEN')
        self.request('/api/v1/matching/applications/'+a0['id']+'/inspection',token=ht,expected=(403,))
        self.request('/api/v1/matching/jobs/'+jobs[0]['id']+'/candidates/'+a0['candidateId'],{},ht,expected=(403,))
        self.check('HR inspection and manual recalculation cannot bypass AI opt-out')
        detail=self.request('/api/v1/recruiter/applications/'+a0['id'],token=ht)['data']
        self.check('HR can inspect consent-free CV snapshot and cover letter',bool(detail['snapshot']['structuredJsonSnapshot']) and detail['coverLetter']=='Thư giới thiệu live')
        before=self.request('/api/v1/recruiter/product/entitlements',token=ht)['data']['cvViews']
        self.request('/api/v1/recruiter/applications/'+a0['id'],token=ht)
        after=self.request('/api/v1/recruiter/product/entitlements',token=ht)['data']['cvViews'];self.check('Repeated view does not spend a second CV view',before==after==1)
        a1=self.request('/api/v1/candidate/applications',{'jobId':jobs[1]['id'],'cvId':cv,'aiAnalysisConsent':True},ct,expected=(201,))['data']
        self.check('Explicit opt-in records consent and invokes real scoring engine',a1['aiAnalysisConsent'] is True and a1['matchStatus']!='CONSENT_NOT_GIVEN')
        listing=self.request('/api/v1/recruiter/jobs/'+jobs[0]['id']+'/applications',token=ht)['data']['content'];self.check('List API does not leak full CV snapshot around view quota',listing[0]['snapshot'].get('structuredJsonSnapshot') is None and listing[0]['snapshot'].get('rawTextSnapshot') is None)
        self.request('/api/v1/recruiter/applications/'+a0['id'],token=h2,expected=(403,));self.check('HR from another company cannot read CV snapshot')
        wallet=self.request('/api/v1/recruiter/services',token=ht)['data'];self.check('New wallet starts at zero with actual service catalog',wallet['credits']==0 and len(wallet['packages'])==3)
        purchase={'requestId':str(uuid.uuid4()),'packageCode':'STANDARD_EXTRA','jobId':jobs[0]['id']}
        self.request('/api/v1/recruiter/services/purchase',purchase,ht,expected=(400,))
        credit={'requestId':str(uuid.uuid4()),'amount':50,'reason':'Live acceptance credit, no financial transaction'}
        self.request('/api/v1/admin/companies/'+company_id+'/credits',credit,admin)
        self.request('/api/v1/admin/companies/'+company_id+'/credits',credit,admin)
        self.request('/api/v1/recruiter/services/purchase',purchase,ht)
        self.request('/api/v1/recruiter/services/purchase',purchase,ht)
        wallet=self.request('/api/v1/recruiter/services',token=ht)['data'];self.check('Credit top-up and purchase are atomic and idempotent',wallet['credits']==30 and len(wallet['transactions'])==2)
        limits=self.request('/api/v1/recruiter/product/entitlements',token=ht)['data'];public=self.request('/api/v1/jobs/'+jobs[0]['id'])['data'];self.check('Purchased package adds CV views and real promotion expiry',limits['cvViewLimit']==120 and bool(public['promotedUntil']))
        self.request('/api/v1/admin/companies/'+company_id+'/trust-level',{'level':3,'reason':'Live reputation approval'},ht,method='PUT',expected=(403,))
        self.request('/api/v1/admin/companies/'+company_id+'/trust-level',{'level':3,'reason':'Live reputation approval'},admin,method='PUT')
        self.request('/api/v1/jobs/'+jobs[5]['id']+'/publish',{},ht);self.check('Only admin can approve level 3; sixth posting then succeeds')
        counts=self.request('/api/v1/recruiter/campaigns',token=ht)['data'];self.check('Campaign application count comes from persisted applications',counts[0]['application_count']==2)
        self.request('/api/v1/recruiter/campaigns/'+campaign,token=ht,method='DELETE');self.check('Deleting campaign preserves jobs and applications',self.request('/api/v1/jobs/'+jobs[0]['id'])['data']['id']==jobs[0]['id'])
        self.context={'candidate':candidate,'hr':hr,'admin':admin,'cv':cv,'jobs':[j['id'] for j in jobs],'applications':[a0['id'],a1['id']],'company':company_id}
        return self.results

    def verify_identity_change(self):
        context=self.context
        self.request('/api/v1/recruiter/company',{'address':'Địa chỉ mới cần thẩm định lại'},context['hr']['accessToken'],method='PUT')
        company=self.request('/api/v1/recruiter/company',token=context['hr']['accessToken'])['data']
        self.request('/api/v1/jobs/'+context['jobs'][0],expected=(404,403))
        self.check('Identity change revokes company verification and hides existing public postings',company['verificationStatus']=='PENDING' and company['verificationLevel']==1)

if __name__=='__main__':
    runner=LiveAcceptance()
    output=Path(os.environ.get('MIDCV_LIVE_REPORT','midcv-product-live-results.json'))
    try:
        runner.run()
        if '--browser' in __import__('sys').argv:
            import tempfile, subprocess
            with tempfile.TemporaryDirectory(prefix='midcv-browser-') as directory:
                context=Path(directory)/'context.json';context.write_text(json.dumps(runner.context),encoding='utf-8');context.chmod(0o600)
                env=dict(os.environ,MIDCV_BROWSER_CONTEXT=str(context))
                result=subprocess.run(['node',str(Path(__file__).with_name('Test-MidcvProductBrowser.mjs'))],env=env,capture_output=True,text=True)
                print(result.stdout)
                if result.returncode: raise AssertionError('Browser validation failed: '+result.stderr[-1800:])
                runner.results.extend({'case':line[7:],'status':'PASS'} for line in result.stdout.splitlines() if line.startswith('PASS | '))
        runner.verify_identity_change()
        report={'status':'PASS','cases':runner.results,'scope':'real HTTP, SMTP/Mailpit, persistent database; no live LLM/OCR quality evaluation'}
    except Exception as error:
        report={'status':'FAIL','cases':runner.results,'failure':str(error)};print('FAIL | '+str(error),flush=True)
    output.write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
    raise SystemExit(0 if report['status']=='PASS' else 1)
