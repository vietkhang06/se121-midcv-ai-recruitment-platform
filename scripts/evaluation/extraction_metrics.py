#!/usr/bin/env python3
"""Compare independently annotated gold JSONL and actual backend extraction JSONL.
Each row: document_id, format (PDF_TEXT/PDF_SCAN/DOCX/JD), fields (map of string lists).
Gold also requires annotator; predictions require source=BACKEND_API. Exact normalized entity match.
"""
import argparse
import json
import unicodedata
from collections import defaultdict
from pathlib import Path

FIELDS = ('skills','experience','education','projects','required','preferred')
FORMATS = {'PDF_TEXT','PDF_SCAN','DOCX','JD'}


def load(path, gold):
    result = {}
    for line in Path(path).read_text(encoding='utf-8').splitlines():
        if not line.strip():
            continue
        row = json.loads(line)
        key = (row['document_id'],row['format'])
        if key in result or key[1] not in FORMATS or not key[0]:
            raise ValueError(f'Invalid or duplicate document: {key}')
        if (gold and not row.get('annotator')) or (not gold and row.get('source') != 'BACKEND_API'):
            raise ValueError('Independent annotator or backend prediction source missing')
        expected = ('required','preferred') if key[1] == 'JD' else FIELDS[:4]
        if set(row['fields']) != set(expected):
            raise ValueError(f'Fields do not match document type: {key}')
        result[key] = {}
        for name, values in row['fields'].items():
            if not isinstance(values,list) or not all(isinstance(v,str) and v.strip() for v in values):
                raise ValueError(f'Invalid entity list: {key}/{name}')
            result[key][name] = {' '.join(unicodedata.normalize('NFKC',v).casefold().split()) for v in values}
    if not result:
        raise ValueError('Empty dataset')
    return result


def evaluate(gold, pred):
    if gold.keys() != pred.keys():
        raise ValueError('Gold and prediction document sets must be identical')
    counts = defaultdict(lambda:[0,0,0])
    for key,fields in gold.items():
        for field,truth in fields.items():
            found = pred[key][field]
            for group in ((key[1],field),('ALL',field)):
                c=counts[group]; c[0]+=len(truth & found); c[1]+=len(found-truth); c[2]+=len(truth-found)
    out=[]
    for (fmt,field),(tp,fp,fn) in sorted(counts.items()):
        precision=tp/(tp+fp) if tp+fp else None
        recall=tp/(tp+fn) if tp+fn else None
        f1=2*tp/(2*tp+fp+fn) if 2*tp+fp+fn else None
        out.append(dict(format=fmt,field=field,tp=tp,fp=fp,fn=fn,precision=precision,recall=recall,f1=f1))
    return dict(documents=len(gold),metric='exact_normalized_entity_micro',results=out)


if __name__ == '__main__':
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--gold',required=True);p.add_argument('--predictions',required=True);p.add_argument('--output',required=True,type=Path)
    a=p.parse_args(); report=evaluate(load(a.gold,True),load(a.predictions,False))
    a.output.parent.mkdir(parents=True,exist_ok=True)
    a.output.write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
