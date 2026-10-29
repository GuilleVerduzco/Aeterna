import sys; sys.path.insert(0,'/home/claude/build')
from render import job
from content import schedule
from multiprocessing import Pool
if __name__=='__main__':
    with Pool(4) as p: print(list(p.imap_unordered(job,[x for x in schedule() if x['kind']=='carousel'])))
