[CmdletBinding()]
param(
    [string]$BaseUrl = 'http://localhost:8080',
    [string]$HrEmail,
    [switch]$CreateHrIfMissing,
    [switch]$Apply,
    [string]$CandidateId,
    [string]$CvId,
    [ValidateRange(0, 600)][int]$MatchingWaitSeconds = 15,
    [string]$ReportPath
)

$ErrorActionPreference = 'Stop'
$script:HttpEvents = [System.Collections.ArrayList]::new()
$script:Access = @{}
$script:ApiRoot = $null
$script:RunError = $null
$script:ExitCode = 0
$script:RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$script:DemoCompanyName = 'MidCV Local Demo Company [MIDCV-LOCAL-DEMO]'
$script:Report = [ordered]@{
    createdAt = [DateTime]::UtcNow.ToString('o')
    mode = if ($Apply) { 'LOCAL_DEMO_WITH_APPLICATIONS' } else { 'LOCAL_DEMO_JOBS_ONLY' }
    company = $null
    jobs = @()
    applications = if ($Apply) { @() } else { $null }
    http = @()
    outcome = 'RUNNING'
    error = $null
}

function Get-ApiData {
    param([Parameter(Mandatory=$true)]$Envelope)
    if ($null -eq $Envelope -or $Envelope.success -ne $true) {
        throw 'The API returned an unsuccessful response envelope.'
    }
    return $Envelope.data
}

function Add-HttpEvent {
    param([string]$Method, [string]$Path, [int]$Status)
    $safePath = $Path -replace '\?.*$', '?[REDACTED]'
    [void]$script:HttpEvents.Add([ordered]@{
        method = $Method
        path = $safePath
        status = $Status
    })
}

function Invoke-MidCvApi {
    param(
        [Parameter(Mandatory=$true)][ValidateSet('GET','POST','PUT')][string]$Method,
        [Parameter(Mandatory=$true)][string]$Path,
        [string]$Token,
        $Body,
        [switch]$AllowFailure
    )
    $uri = $script:ApiRoot.TrimEnd('/') + $Path
    $headers = @{ Accept = 'application/json' }
    if (-not [string]::IsNullOrWhiteSpace($Token)) {
        $headers.Authorization = "Bearer $Token"
    }
    try {
        $response = if ($null -ne $Body) {
            Invoke-WebRequest -UseBasicParsing -MaximumRedirection 0 -Method $Method -Uri $uri -Headers $headers `
                -ContentType 'application/json' -Body (ConvertTo-Json -InputObject $Body -Depth 16 -Compress) -TimeoutSec 30
        } else {
            Invoke-WebRequest -UseBasicParsing -MaximumRedirection 0 -Method $Method -Uri $uri -Headers $headers -TimeoutSec 30
        }
        $status = [int]$response.StatusCode
        $envelope = $response.Content | ConvertFrom-Json
        Add-HttpEvent -Method $Method -Path $Path -Status $status
        return [pscustomobject]@{ StatusCode = $status; Envelope = $envelope }
    } catch {
        $status = 0
        try { $status = [int]$_.Exception.Response.StatusCode } catch { }
        $caughtError = $_
        $errorCode = $null
        $errorJson = $null
        if ($status -gt 0) {
            try {
                if ($caughtError.ErrorDetails.Message) {
                    $errorJson = $caughtError.ErrorDetails.Message | ConvertFrom-Json
                }
            } catch { $errorJson = $null }
            if ($null -eq $errorJson -and $caughtError.Exception.Response) {
                try {
                    $stream = $caughtError.Exception.Response.GetResponseStream()
                    if ($stream) {
                        $reader = New-Object System.IO.StreamReader($stream)
                        try { $errorJson = $reader.ReadToEnd() | ConvertFrom-Json } finally { $reader.Dispose() }
                    }
                } catch { $errorJson = $null }
            }
            if ($errorJson -and $errorJson.error) { $errorCode = [string]$errorJson.error.code }
        }
        Add-HttpEvent -Method $Method -Path $Path -Status $status
        if ($AllowFailure) {
            return [pscustomobject]@{ StatusCode = $status; Envelope = $null; ErrorCode = $errorCode }
        }
        if ($status -gt 0) {
            # Only the job validation response is summarized. Never print raw HTTP bodies or credentials.
            if ($Path -eq '/api/v1/jobs/draft' -and $status -eq 400 -and $errorJson) {
                $safeCode = [string]$errorJson.error.code
                $safeMessage = [string]$errorJson.error.message
                $fieldNames = ''
                if ($errorJson.error.details) {
                    $fieldNames = @($errorJson.error.details.PSObject.Properties.Name) -join ', '
                }
                throw "Job draft rejected: HTTP 400; code=$safeCode; message=$safeMessage; fields=$fieldNames"
            }
            throw "API request failed: $Method $Path returned HTTP $status. No response body or credential was logged."
        }
        throw "API request failed: $Method $Path could not reach the local backend. No credential was logged."
    }
}

function Get-InputText {
    param([string]$Value, [string]$EnvironmentName, [string]$Prompt)
    if (-not [string]::IsNullOrWhiteSpace($Value)) { return $Value.Trim() }
    $environmentValue = [Environment]::GetEnvironmentVariable($EnvironmentName, 'Process')
    if (-not [string]::IsNullOrWhiteSpace($environmentValue)) { return $environmentValue.Trim() }
    return (Read-Host $Prompt).Trim()
}

function Get-SecretText {
    param([string]$EnvironmentName, [string]$Prompt)
    $environmentValue = [Environment]::GetEnvironmentVariable($EnvironmentName, 'Process')
    if (-not [string]::IsNullOrWhiteSpace($environmentValue)) { return $environmentValue }
    $secure = Read-Host $Prompt -AsSecureString
    $pointer = [IntPtr]::Zero
    try {
        $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
        return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
    } finally {
        if ($pointer -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer) }
        if ($secure) { $secure.Dispose() }
    }
}

function Get-AccessToken {
    param([string]$Kind, [string]$Email, [string]$Password)
    $login = Invoke-MidCvApi -Method POST -Path '/api/v1/auth/login' -Body @{ email = $Email; password = $Password } -AllowFailure
    if ($login.StatusCode -ne 200) {
        if ($login.ErrorCode -eq 'EMAIL_NOT_VERIFIED') { return [pscustomobject]@{ Token = $null; State = 'EMAIL_NOT_VERIFIED' } }
        if ($login.StatusCode -in @(401, 403)) { return [pscustomobject]@{ Token = $null; State = 'INVALID_CREDENTIALS_OR_FORBIDDEN' } }
        throw "$Kind login could not be completed (HTTP $($login.StatusCode)); no credentials or response body were logged."
    }
    $data = Get-ApiData $login.Envelope
    if ([string]::IsNullOrWhiteSpace([string]$data.accessToken)) { throw "$Kind login returned no access token." }
    $expectedRole = switch ($Kind) { 'HR' { 'HR' } 'ADMIN' { 'ADMIN' } 'CANDIDATE' { 'CANDIDATE' } }
    if ([string]$data.role -ne $expectedRole) { throw "The supplied account is not a $expectedRole account." }
    return [pscustomobject]@{ Token = [string]$data.accessToken; State = 'AUTHENTICATED' }
}

function Complete-EmailVerification {
    param([string]$Email, [switch]$AlreadyRequested)
    if (-not $AlreadyRequested) {
        $resend = Invoke-MidCvApi -Method POST -Path '/api/v1/auth/resend-verification' -Body @{ email = $Email } -AllowFailure
        if ($resend.StatusCode -eq 429) {
            Write-Host 'A verification email was sent recently; the API rate-limits resends for 60 seconds.'
        } elseif ($resend.StatusCode -ne 200) {
            throw "Could not request verification email (HTTP $($resend.StatusCode)); use the existing email flow or retry later."
        }
    }
    Write-Host "Open the actual verification email for $Email, follow its link, then return here."
    Write-Host 'For local SMTP, use the configured mailbox/Mailpit UI if available. Do not paste the verification token into this script.'
    $null = Read-Host 'Press Enter after completing email verification'
    $script:Report.verificationFlow = 'USER_COMPLETED_EMAIL_LINK'
}

function Get-AdminToken {
    if ($script:Access.Admin) { return $script:Access.Admin }
    $adminEmail = Get-InputText -Value $null -EnvironmentName 'MIDCV_ADMIN_EMAIL' -Prompt 'Existing local Admin email'
    $adminPassword = Get-SecretText -EnvironmentName 'MIDCV_ADMIN_PASSWORD' -Prompt 'Existing local Admin password (hidden)'
    $adminLogin = Get-AccessToken -Kind 'ADMIN' -Email $adminEmail -Password $adminPassword
    $token = $adminLogin.Token
    $adminPassword = $null
    if (-not $token) { throw 'Admin login failed. Provide an existing local Admin account; the seeder will not fabricate privileges.' }
    $script:Access.Admin = $token
    return $token
}

function Get-AllRecruiterJobs {
    param([string]$Token)
    $all = [System.Collections.ArrayList]::new()
    for ($page = 0; $page -lt 100; $page++) {
        $result = Invoke-MidCvApi -Method GET -Path "/api/v1/recruiter/jobs?page=$page&size=100&sort=createdAt&direction=desc" -Token $Token
        $pageData = Get-ApiData $result.Envelope
        foreach ($job in @($pageData.content)) { [void]$all.Add($job) }
        if ($page -ge ([int]$pageData.totalPages - 1) -or @($pageData.content).Count -eq 0) { break }
    }
    return ,$all.ToArray()
}

function Get-AllCandidateApplications {
    param([string]$Token)
    $all = [System.Collections.ArrayList]::new()
    for ($page = 0; $page -lt 100; $page++) {
        $result = Invoke-MidCvApi -Method GET -Path "/api/v1/candidate/applications?page=$page&size=100&sort=createdAt&direction=desc" -Token $Token
        $pageData = Get-ApiData $result.Envelope
        foreach ($application in @($pageData.content)) { [void]$all.Add($application) }
        if ($page -ge ([int]$pageData.totalPages - 1) -or @($pageData.content).Count -eq 0) { break }
    }
    return ,$all.ToArray()
}

function Ensure-DemoCompanyVerified {
    param([string]$HrToken, $Company)
    if ([string]$Company.name -ne $script:DemoCompanyName) {
        throw "Company is not the reserved fictional demo company. No verification change was made."
    }
    if ([string]$Company.verificationStatus -eq 'VERIFIED') { return $Company }

    $submitStates = @('PENDING', 'CHANGES_REQUESTED', 'REJECTED')
    if ([string]$Company.verificationStatus -in $submitStates) {
        $null = Invoke-MidCvApi -Method POST -Path '/api/v1/recruiter/company/submit-verification' -Token $HrToken
    } elseif ([string]$Company.verificationStatus -ne 'UNDER_REVIEW') {
        throw "Demo company is in unsupported verification state '$($Company.verificationStatus)'; no bypass was attempted."
    }

    $adminToken = Get-AdminToken
    $detailResult = Invoke-MidCvApi -Method GET -Path "/api/v1/admin/companies/$($Company.id)" -Token $adminToken
    $adminCompany = Get-ApiData $detailResult.Envelope
    if ([string]$adminCompany.name -ne $script:DemoCompanyName -or [string]$adminCompany.id -ne [string]$Company.id) {
        throw 'Admin API company identity did not match the reserved demo company; approval stopped.'
    }
    if ([string]$adminCompany.verificationStatus -eq 'PENDING' -or
        [string]$adminCompany.verificationStatus -eq 'CHANGES_REQUESTED' -or
        [string]$adminCompany.verificationStatus -eq 'REJECTED') {
        $startBody = @{ reason = 'Local-only fictional demo company for MidCV UI data; this is not legal business verification.'; version = $adminCompany.version }
        $start = Invoke-MidCvApi -Method POST -Path "/api/v1/admin/companies/$($Company.id)/verification/start-review" -Token $adminToken -Body $startBody
        $adminCompany = Get-ApiData $start.Envelope
    }
    if ([string]$adminCompany.verificationStatus -eq 'UNDER_REVIEW') {
        $approveBody = @{ reason = 'Local-only fictional demo company for MidCV UI data; this is not legal business verification.'; version = $adminCompany.version }
        $approved = Invoke-MidCvApi -Method POST -Path "/api/v1/admin/companies/$($Company.id)/verification/approve" -Token $adminToken -Body $approveBody
        $adminCompany = Get-ApiData $approved.Envelope
    }
    if ([string]$adminCompany.verificationStatus -ne 'VERIFIED') {
        throw 'The real Admin API did not return VERIFIED for the fictional demo company.'
    }
    $Company.verificationStatus = $adminCompany.verificationStatus
    return $Company
}

function Get-MatchState {
    param([string]$Token, [string]$ApplicationId, [int]$WaitSeconds)
    $deadline = [DateTime]::UtcNow.AddSeconds($WaitSeconds)
    $lastState = 'NOT_AVAILABLE'
    do {
        $result = Invoke-MidCvApi -Method GET -Path "/api/v1/matching/applications/$ApplicationId/inspection" -Token $Token -AllowFailure
        if ($result.StatusCode -eq 200) {
            $data = Get-ApiData $result.Envelope
            $state = [string]$data.calculationStatus
            if ([string]::IsNullOrWhiteSpace($state)) { $state = [string]$data.status }
            if (-not [string]::IsNullOrWhiteSpace($state)) { $lastState = $state }
            if ($lastState -eq 'PGVECTOR_READY') { return $lastState }
            if ([DateTime]::UtcNow -ge $deadline) { break }
        } elseif ($result.StatusCode -notin @(0, 404, 409)) {
            break
        }
        if ([DateTime]::UtcNow -lt $deadline) { Start-Sleep -Seconds 3 }
    } while ([DateTime]::UtcNow -lt $deadline)
    return $lastState
}

function Write-RedactedReport {
    if ([string]::IsNullOrWhiteSpace($ReportPath)) {
        $stamp = '{0}-{1}' -f (Get-Date -Format 'yyyyMMdd-HHmmss-fff'), [Guid]::NewGuid().ToString('N').Substring(0, 8)
        $path = Join-Path $script:RepoRoot ("midcv-demo-report-$stamp.json")
    } else {
        $path = [System.IO.Path]::GetFullPath($ReportPath)
    }
    $targetRoot = [System.IO.Path]::GetFullPath((Join-Path $script:RepoRoot 'backend\target')) + [System.IO.Path]::DirectorySeparatorChar
    if ($path.StartsWith($targetRoot, [StringComparison]::OrdinalIgnoreCase)) {
        throw 'ReportPath must be outside backend/target.'
    }
    if (Test-Path $path) { throw 'ReportPath already exists; choose a new path so existing evidence is preserved.' }
    $script:Report.http = @($script:HttpEvents.ToArray())
    $script:Report.error = $script:RunError
    $script:Report.outcome = if ($script:ExitCode -eq 0) { 'SUCCEEDED' } else { 'FAILED' }
    $parent = Split-Path -Parent $path
    if ($parent -and -not (Test-Path $parent)) { New-Item -ItemType Directory -Path $parent -Force | Out-Null }
    $script:Report | ConvertTo-Json -Depth 16 | Set-Content -Path $path -Encoding UTF8
    Write-Host "Redacted report: $path"
}

try {
    $uri = [Uri]$BaseUrl
    if ($uri.Scheme -notin @('http', 'https') -or $uri.Host -notin @('localhost', '127.0.0.1') -or
        $uri.UserInfo -or $uri.Query -or $uri.Fragment -or $uri.AbsolutePath.Trim('/') -ne '') {
        throw 'BaseUrl must be a root HTTP(S) URL whose host is exactly localhost or 127.0.0.1.'
    }
    $script:ApiRoot = $uri.GetLeftPart([UriPartial]::Authority)

    $healthResult = Invoke-MidCvApi -Method GET -Path '/actuator/health' -AllowFailure
    if ($healthResult.StatusCode -ne 200 -or [string]$healthResult.Envelope.status -ne 'UP') {
        throw 'Local backend health preflight failed; expected HTTP 200 and status UP.'
    }

    $HrEmail = Get-InputText -Value $HrEmail -EnvironmentName 'MIDCV_HR_EMAIL' -Prompt 'Existing HR email'
    $hrPassword = Get-SecretText -EnvironmentName 'MIDCV_HR_PASSWORD' -Prompt 'HR password (hidden)'
    $hrLogin = Get-AccessToken -Kind 'HR' -Email $HrEmail -Password $hrPassword
    $hrToken = $hrLogin.Token

    if (-not $hrToken) {
        $check = Invoke-MidCvApi -Method GET -Path ("/api/v1/auth/check-email?email=" + [Uri]::EscapeDataString($HrEmail)) -AllowFailure
        if ($check.StatusCode -ne 200) { throw 'Could not determine whether the HR email already exists; no account was created.' }
        $emailData = Get-ApiData $check.Envelope
        if ($emailData.exists -eq $true) {
            if ($hrLogin.State -ne 'EMAIL_NOT_VERIFIED') {
                throw 'This HR email already exists, but login did not confirm an unverified-email state. Check the password/account status; no duplicate account was created.'
            }
            Complete-EmailVerification -Email $HrEmail
            $hrLogin = Get-AccessToken -Kind 'HR' -Email $HrEmail -Password $hrPassword
            $hrToken = $hrLogin.Token
            if (-not $hrToken) { throw 'Email verification did not result in a successful HR login; no company or jobs were created.' }
        } else {
        if (-not $CreateHrIfMissing) { throw 'No HR account exists. Rerun with -CreateHrIfMissing to register the fictional local demo HR.' }

        # Verify an actual Admin account before creating any new account or company.
        $null = Get-AdminToken
        $fullName = 'MidCV Local Demo Recruiter'
        $taxCode = 'DEMO-LOCAL-' + [Guid]::NewGuid().ToString('N').Substring(0, 8).ToUpperInvariant()
        $registerBody = @{
            email = $HrEmail
            password = $hrPassword
            fullName = $fullName
            companyName = $script:DemoCompanyName
            companyTaxCode = $taxCode
            companyWebsite = 'https://example.invalid'
            companyIndustry = 'Technology'
        }
        $registered = Invoke-MidCvApi -Method POST -Path '/api/v1/auth/register/recruiter' -Body $registerBody
        $registrationData = Get-ApiData $registered.Envelope
        $registerBody.password = $null
        if ([string]::IsNullOrWhiteSpace([string]$registrationData.devVerificationToken)) {
            Complete-EmailVerification -Email $HrEmail -AlreadyRequested
        } else {
            $verificationToken = [string]$registrationData.devVerificationToken
            $null = Invoke-MidCvApi -Method POST -Path '/api/v1/auth/verify-email' -Body @{ token = $verificationToken }
            $verificationToken = $null
        }
        $hrLogin = Get-AccessToken -Kind 'HR' -Email $HrEmail -Password $hrPassword
        $hrToken = $hrLogin.Token
        if (-not $hrToken) { throw 'Verified demo HR could not log in; no further records were created.' }
        }
    }
    $hrPassword = $null
    $script:Access.HR = $hrToken

    $companyResult = Invoke-MidCvApi -Method GET -Path '/api/v1/recruiter/company' -Token $hrToken
    $company = Get-ApiData $companyResult.Envelope
    if ($null -eq $company.id) { throw 'HR account has no linked company. The seeder will not attach or replace a company.' }
    if ([string]$company.verificationStatus -ne 'VERIFIED') {
        if ([string]$company.name -ne $script:DemoCompanyName) {
            throw "The HR company's verification is '$($company.verificationStatus)'. Only the reserved fictional demo company may be approved by this script."
        }
        $company = Ensure-DemoCompanyVerified -HrToken $hrToken -Company $company
    }
    $script:Report.company = [ordered]@{
        id = [string]$company.id
        verificationState = [string]$company.verificationStatus
    }

    $specs = @(
        [ordered]@{
            key = 'HIGH'; title = '[MIDCV-DEMO-HIGH] Junior Java Spring Backend Developer'
            description = 'Tuyển lập trình viên backend cấp Junior tham gia phát triển API cho sản phẩm web. Công việc tập trung vào Java, Spring Boot, PostgreSQL, thiết kế REST API, kiểm thử và phối hợp cùng nhóm kỹ thuật. Tin tuyển dụng này chỉ mô tả yêu cầu của vị trí, không khẳng định kinh nghiệm hay năng lực của bất kỳ ứng viên nào.'
            responsibilities = @('Phát triển và bảo trì REST API bằng Java và Spring Boot.', 'Làm việc với PostgreSQL và viết kiểm thử cho các luồng nghiệp vụ.', 'Phối hợp review mã nguồn, ghi nhận lỗi và cải thiện chất lượng dịch vụ.')
            required = @('Java', 'Spring Boot', 'PostgreSQL', 'REST API')
            preferred = @('Redis', 'RabbitMQ', 'Spring Security', 'Docker')
        },
        [ordered]@{
            key = 'PARTIAL'; title = '[MIDCV-DEMO-PARTIAL] Junior Cloud Event Backend Developer'
            description = 'Tuyển lập trình viên backend cấp Junior cho hệ thống xử lý sự kiện trên nền tảng cloud. Vị trí tập trung vào AWS Lambda, EventBridge, DynamoDB và dịch vụ .NET; React và Terraform là lợi thế. Tin tuyển dụng không đưa ra nhận định nào về hồ sơ ứng viên.'
            responsibilities = @('Xây dựng và kiểm thử các hàm xử lý sự kiện trên AWS Lambda.', 'Thiết kế luồng sự kiện với EventBridge và lưu trữ dữ liệu trong DynamoDB.', 'Phối hợp với nhóm ứng dụng và hạ tầng để triển khai dịch vụ .NET.')
            required = @('AWS Lambda', 'EventBridge', 'DynamoDB', '.NET')
            preferred = @('React', 'Terraform')
        },
        [ordered]@{
            key = 'LOW'; title = '[MIDCV-DEMO-LOW] Junior Data Engineering Developer'
            description = 'Tuyển kỹ sư dữ liệu cấp Junior tham gia xây dựng pipeline ETL và xử lý dữ liệu theo lô. Công việc sử dụng Python, Apache Spark và Airflow; kiến thức SQL là lợi thế. Nội dung chỉ mô tả vị trí tuyển dụng, không gán thông tin kinh nghiệm cho ứng viên.'
            responsibilities = @('Phát triển các tác vụ ETL bằng Python và Apache Spark.', 'Thiết lập lịch chạy và theo dõi pipeline bằng Airflow.', 'Kiểm tra chất lượng dữ liệu và ghi nhận lỗi xử lý.')
            required = @('Python', 'Spark', 'Airflow', 'ETL')
            preferred = @('SQL')
        }
    )

    $allJobs = @(Get-AllRecruiterJobs -Token $hrToken)
    $seededJobs = [System.Collections.ArrayList]::new()
    foreach ($spec in $specs) {
        $job = $allJobs | Where-Object { $_.title -eq $spec.title } | Select-Object -First 1
        $action = 'EXISTING'
        if ($null -eq $job) {
            $requirements = @()
            foreach ($skill in $spec.required) { $requirements += @{ skillName = $skill; type = 'REQUIRED'; minYearsExp = 0 } }
            foreach ($skill in $spec.preferred) { $requirements += @{ skillName = $skill; type = 'PREFERRED'; minYearsExp = 0 } }
            $draftBody = @{
                title = $spec.title
                industry = 'Technology'
                seniority = 'Junior'
                employmentType = 'FULL_TIME'
                location = 'Việt Nam · Làm việc linh hoạt'
                description = $spec.description
                responsibilities = $spec.responsibilities
                salaryNegotiable = $true
                requirements = $requirements
            }
            $created = Invoke-MidCvApi -Method POST -Path '/api/v1/jobs/draft' -Token $hrToken -Body $draftBody
            $job = Get-ApiData $created.Envelope
            if ([string]$job.title -ne $spec.title -or [string]$job.companyId -ne [string]$company.id) {
                throw 'Created job identity did not match the expected demo title and HR company.'
            }
            $action = 'CREATED'
        }
        if ([string]$job.status -eq 'DRAFT') {
            $published = Invoke-MidCvApi -Method POST -Path "/api/v1/jobs/$($job.id)/publish" -Token $hrToken
            $job = Get-ApiData $published.Envelope
            if ([string]$job.status -ne 'PUBLISHED') { throw "Job $($job.id) did not publish through the API." }
            if ($action -eq 'EXISTING') { $action = 'PUBLISHED_EXISTING_DRAFT' }
        }
        [void]$seededJobs.Add([pscustomobject]@{
            key = $spec.key
            id = [string]$job.id
            title = [string]$job.title
            publicationState = [string]$job.status
            action = $action
        })
    }
    $script:Report.jobs = @($seededJobs.ToArray())

    if ($Apply) {
        if ([string]::IsNullOrWhiteSpace($CvId)) { throw '-Apply requires -CvId for an existing candidate-owned, confirmed CV.' }
        $candidateEmail = Get-InputText -Value $null -EnvironmentName 'MIDCV_CANDIDATE_EMAIL' -Prompt 'Existing Candidate email'
        $candidatePassword = Get-SecretText -EnvironmentName 'MIDCV_CANDIDATE_PASSWORD' -Prompt 'Candidate password (hidden)'
        $candidateLogin = Get-AccessToken -Kind 'CANDIDATE' -Email $candidateEmail -Password $candidatePassword
        $candidateToken = $candidateLogin.Token
        $candidatePassword = $null
        if (-not $candidateToken) { throw 'Candidate login failed; no applications were submitted.' }

        $cvListResult = Invoke-MidCvApi -Method GET -Path '/api/v1/candidate/cvs?page=0&size=100&sort=createdAt&direction=desc' -Token $candidateToken
        $cvList = Get-ApiData $cvListResult.Envelope
        $cv = @($cvList.content) | Where-Object { [string]$_.id -eq $CvId } | Select-Object -First 1
        if ($null -eq $cv) { throw 'The supplied CV is not visible in the authenticated candidate CV list; no applications were submitted.' }
        if ($CandidateId -and [string]$cv.candidateId -ne $CandidateId) { throw 'CandidateId does not own the supplied CV; no applications were submitted.' }
        $versionsResult = Invoke-MidCvApi -Method GET -Path "/api/v1/candidate/cvs/$CvId/versions" -Token $candidateToken
        $versions = Get-ApiData $versionsResult.Envelope
        $latestVersion = @($versions) | Select-Object -First 1
        if ($null -eq $latestVersion -or [string]$latestVersion.status -ne 'CONFIRMED') {
            throw 'The supplied CV latest version is not CONFIRMED; no applications were submitted.'
        }
        $script:Report.candidateProfileId = [string]$cv.candidateId
        $script:Report.cvVersionId = [string]$latestVersion.versionId

        $existingApps = @(Get-AllCandidateApplications -Token $candidateToken)
        $applicationRows = [System.Collections.ArrayList]::new()
        foreach ($job in $script:Report.jobs) {
            if ($job.publicationState -ne 'PUBLISHED') {
                throw "Job $($job.id) is not published; application was not submitted."
            }
            $application = $existingApps | Where-Object { [string]$_.jobId -eq $job.id } | Select-Object -First 1
            $action = 'EXISTING'
            if ($null -eq $application) {
                $submitted = Invoke-MidCvApi -Method POST -Path '/api/v1/candidate/applications' -Token $candidateToken -Body @{ jobId = $job.id; cvId = $CvId }
                $application = Get-ApiData $submitted.Envelope
                $action = 'APPLIED'
            }
            if ($null -eq $application.id) { throw "Application response for job $($job.id) contained no ID." }
            $matchState = Get-MatchState -Token $candidateToken -ApplicationId ([string]$application.id) -WaitSeconds $MatchingWaitSeconds
            [void]$applicationRows.Add([pscustomobject]@{
                jobId = $job.id
                id = [string]$application.id
                applicationState = [string]$application.status
                matchingState = $matchState
                action = $action
            })
        }
        $script:Report.applications = @($applicationRows.ToArray())
    }
} catch {
    $script:ExitCode = 1
    $script:RunError = $_.Exception.Message
    Write-Error $script:RunError
} finally {
    try { Write-RedactedReport } catch { Write-Error 'Could not write the redacted report outside backend/target.'; $script:ExitCode = 1 }
    $hrPassword = $null
    $candidatePassword = $null
    $adminPassword = $null
    $verificationToken = $null
    $registerBody = $null
    $registered = $null
    $registrationData = $null
    $hrToken = $null
    $candidateToken = $null
    $script:Access.Clear()
}

if ($script:ExitCode -eq 0) {
    Write-Host ''
    [pscustomobject]$script:Report.company | Format-Table -AutoSize
    $script:Report.jobs | Format-Table key, id, title, publicationState, action -AutoSize
    if ($Apply) { $script:Report.applications | Format-Table jobId, id, applicationState, matchingState, action -AutoSize }
} else {
    exit $script:ExitCode
}
