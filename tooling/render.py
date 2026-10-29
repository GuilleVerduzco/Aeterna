import sys, json; sys.path.insert(0,'/home/claude/build')
from engine import *
from content import schedule
from multiprocessing import Pool
items = schedule()
def job(p):
    if p['kind']=='reel':
        render_reel(p)
    else:
        n=len(p['slides']); srcs=['a','b']
        for i,s in enumerate(p['slides']):
            slide(OUT+f"{p['id']}_{i+1}.jpg", p['theme'], s['kicker'], s['title'], body=s.get('body'), n=i+1, total=n,
                  src=srcs[(i+int(p['id'][1:]))%2], t=1.0+((i*3+int(p['id'][1:]))%7), flip=bool(i%2), cta=s.get('cta'), big=s.get('big'))
    return p['id']
if __name__=='__main__':
    with Pool(4) as pool:
        for r in pool.imap_unordered(job, items): print(r, flush=True)
    json.dump(items, open(OUT+'plan.json','w'), ensure_ascii=False, indent=1)
