import sys; sys.path.insert(0,'/home/claude/build')
from engine import *
from content import schedule
from multiprocessing import Pool
if __name__=='__main__':
    with Pool(4) as pool:
        print(list(pool.imap_unordered(render_reel,[p for p in schedule() if p['kind']=='reel'])))
