import json,os,random,urllib.request as U
from itertools import compress
I=30000
Z=range(64)
def Y(D,n):return[[y for y in([a*8+c for k in range(1,n)for a,c in[(i//8+k*x,i%8+k*z)]if 0<=a<8>c>=0]for x,z in D)if y]for i in Z]
O=[(1,0),(-1,0),(0,1),(0,-1)]
X=[(1,1),(1,-1),(-1,1),(-1,-1)]
R=[0,0,Y([(x,z)for x in(-2,-1,1,2)for z in(-2,-1,1,2)if x*x!=z*z],2),Y(X,8),Y(O,8),Y(O+X,8),Y(O+X,2)]
R+=[R[4]]
PC=[[t for t in(i+7,i+9)if t<64 and abs(t%8-i%8)==1]for i in Z]
AL=[{t for y in R[5][k]for t in y}for k in Z]
T=bytes([0,9,10,11,12,13,14,15,0,1,2,3,4,5,6,7,32]+[0]*239)
OW=bytes([0]+[1]*7+[0]*248)
V=[1,1,3,3,5,9,10,5]
BIG=1<<30
KB=1<<24
TT={}
def A(b,k):
 for y in R[4][k]:
  for t in y:
   q=b[t]
   if q&15:
    if q in(12,13,15)or q==14 and t==y[0]:return 1
    break
 for y in R[3][k]:
  for t in y:
   q=b[t]
   if q&15:
    if q in(11,13)or t==y[0]and(q==14 or q==9 and t>k):return 1
    break
 for y in R[2][k]:
  if b[y[0]]==10:return 1
def G(b,H):
 L=[];ap=L.append
 for f in compress(Z,b.translate(OW)):
  p=b[f]
  if p<2:
   for t in PC[f]:
    q=b[t]
    if q>8:ap((BIG+100*V[q&7]-1,f,t))
   t=f+8
   if not b[t]&15:
    if t>55:ap((BIG+800,f,t))
    else:
     ap((H[f][t],f,t))
     if f<16 and not b[t+8]&15:ap((H[f][t+8],f,t+8))
  else:
   h=H[f]
   for y in R[p][f]:
    for t in y:
     q=b[t]
     if q&15:
      if q&8:ap((BIG+100*V[q&7]-V[p],f,t))
      break
     ap((h[t],f,t))
   if p==6:
    for r,d in(0,-1),(7,1):
     if b[r]==7 and not any(b[x]&15 for x in range(min(f,r)+1,max(f,r)))and not(A(b,f)or A(b,f+d)):ap((0,f,f+2*d))
 return L
def C(b):
 L=[];ap=L.append
 for f in compress(Z,b.translate(OW)):
  p=b[f]
  if p<2:
   for t in PC[f]:
    q=b[t]
    if q>8:
     if q==14:return
     ap((100*V[q&7]-1,f,t))
   if f>47 and not b[f+8]&15:ap((800,f,f+8))
  else:
   for y in R[p][f]:
    for t in y:
     q=b[t]
     if q&15:
      if q&8:
       if q==14:return
       ap((100*V[q&7]-V[p],f,t))
      break
 return L
def M(b,f,t,o=5):
 n=bytearray(b);p=n[f];n[f]=0
 if p<2:
  if t>55:p=o
  if b[t]==32:n[t-8]=0
  if t-f==16:n[f+8]=16
 if p==6:
  if abs(t-f)==2:n[7*(t>f)]=0;n[(f+t)//2]=4
  n=n.replace(b'\7',b'\4')
 n[t]=4 if p==7 else p
 return n
def F(n):return bytes(n.translate(T))[::-1]
def D(b,f,t,w,o):
 p=b[f];q=b[t];x=w[p]
 d=x[t]-x[f]
 if q>8:
  if q<16:d+=o[q-8][63-t]
  elif p<2:d+=o[1][71-t]
 if p<2 and t>55:d+=w[5][t]-x[t]
 if p==6 and abs(t-f)==2:d+=w[4][(f+t)//2]-w[4][7*(t>f)]
 return d
def Q(b,s,a,B,w,o):
 global N
 N+=1
 if s>=B:return s
 if s>a:a=s
 L=C(b)
 if L is None:return I
 L.sort(reverse=True)
 for _,f,t in L:
  if V[b[f]]>V[b[t]&7]and A(b,t):continue
  d=D(b,f,t,w,o)
  if s+d+150<=a:continue
  v=-Q(F(M(b,f,t)),-s-d,-B,-a,o,w)
  if v>a:
   if v>=B:return v
   a=v
 return a
def MV(b,m0,h):
 if m0:yield m0
 for m in sorted(G(b,h),reverse=True):
  if m[1:]!=m0:yield m[1:]
def S(b,s,d,a,B,P):
 global N
 N+=1
 if N>LIM:1/0
 if b in HS:return 20*(P%2*2-1)
 if P+J>199:
  m=sum((0,1,3,3,5,9,0,5)[q&7]*(1-q//8*2)for q in b if q&15)
  return(m>4)*9000-(m<-4)*9000
 e=TT.get(b);m0=None
 if e:
  m0=e[3]
  if e[0]>=d and(e[2]==0 or e[2]==1 and e[1]>=B or e[2]==2 and e[1]<=a):return e[1]
 k=b.index(6);c=A(b,k);w=WW[P&1];o=WW[~P&1]
 if c:d+=1
 if d<=0:return Q(b,s,a,B,w,o)
 u=0;lm=99
 if not c:
  if d<3:
   if s-150*d>=B:return s
   u=s+150*d<=a;lm=5+6*d
  elif s>=B and NM:
   v=-S(b.translate(T)[::-1],-s,d-3-d//4,-B,1-B,P+1)
   if v>=B:return v
  if d>3 and not m0:d-=1
 best=-I;bm=None;a0=a;i=0;h=HH[P&1];HS.add(b)
 for f,t in MV(b,m0,h):
  x=b[t]>8 or b[f]<2 and t>55
  if i and not x and(u or i>lm):continue
  n=M(b,f,t)
  if(c or f==k or f in AL[k])and A(n,t if f==k else k):continue
  nb=F(n);ns=-s-D(b,f,t,w,o)
  if i==0:v=-S(nb,ns,d-1,-B,-a,P+1)
  else:
   r=(i>3)+(i>9)if d>2 and not x and not c else 0
   v=-S(nb,ns,d-1-r,-a-1,-a,P+1)
   if r and v>a:v=-S(nb,ns,d-1,-a-1,-a,P+1)
   if a<v<B:v=-S(nb,ns,d-1,-B,-a,P+1)
  i+=1
  if v>best:
   best=v;bm=f,t
   if v>a:
    a=v
    if a>=B:
     if not x:
      h[f][t]+=d*d;z=K.get(P)
      if z!=bm:
       if z:h[z[0]][z[1]]-=KB
       K[P]=bm;h[f][t]+=KB
     break
 HS.remove(b)
 if i==0:return P-20000 if c else 0
 TT[b]=d,best,2 if best<=a0 else 1 if best>=B else 0,bm
 return best
def mk(b,ph):
 W=[0]*8;k=b.index(6);e=b.index(14)
 for p in range(1,7):
  W[p]=[0]*64
  for i in Z:
   r=i//8;f=i%8;z=min(f,7-f);c=z+min(r,7-r);d=7-max(abs(r-e//8),abs(f-e%8))
   u=not any(b[j]==9 for j in Z if j//8>r and abs(j%8-f)<2)
   m,g=[0,(100+(0,0,2,6,14,28,50,0)[r]+(z>2)*(0,-14,6,18,20,10,0,0)[r]+(z==2)*(0,0,2,8,8,4,0,0)[r]+u*(0,0,0,6,14,26,44,0)[r]+(k<8 and abs(f-k%8)<2 and k%8 not in(3,4))*(0,12,5,0,0,0,0,0)[r],120+(0,2,6,14,28,50,80,0)[r]+u*(0,6,12,24,44,72,110,0)[r]),(298+7*c+3*d,278+7*c+d),(325+4*c+2*d,310+4*c+d),(500+18*(r==6)+4*(z>2)+2*d+12*(not any(b[j]==1 for j in range(f,64,8))),530+8*(r==6)+d),(944+2*c+5*d,938+4*c+2*d),((r==0)*(18,26,8,-6,-6,8,26,18)[f]-25*(r>0)-10*r,9*c-28+3*d)][p]
   W[p][i]=(m*ph+g*(24-ph))//24+NZ[p*64+i]
 W[7]=W[4]
 return W
def go(b,L,lim):
 global N,LIM,HH,K,WW,NM
 N=0;LIM=lim;HH=[[[0]*64 for _ in Z]for _ in(0,1)];K={}
 if len(TT)>2e5:TT.clear()
 ph=min(24,sum((0,0,1,1,2,4,0,2)[p&7]for p in b if p<16))
 NM=ph>2
 WW=w,o=mk(b,ph),mk(b.translate(T)[::-1],ph)
 s=sum(w[p][i]if p<8 else-o[p-8][63-i]for i,p in enumerate(b)if p&15)
 best=L[0]
 if len(L)<2:return best
 try:
  for d in range(1,64):
   lo,hi=(g-35,g+35)if d>3 else(-I,I)
   while 1:
    a=lo
    for i,(f,t)in enumerate(L):
     nb=F(M(b,f,t));ns=-s-D(b,f,t,w,o)
     if i==0:v=-S(nb,ns,d-1,-hi,-a,1)
     else:
      v=-S(nb,ns,d-1,-a-1,-a,1)
      if v>a:v=-S(nb,ns,d-1,-hi,-a,1)
     if v>a:
      a=v;best=f,t
      if a>=hi:break
    L.remove(best);L.insert(0,best)
    if lo<a<hi:break
    lo,hi=-I,I
   g=a
   if abs(a)>19000:break
 except:pass
 return best
B0=bytes([7,2,3,5,6,3,2,7]+[1]*8+[0]*32+[9]*8+[15,10,11,13,14,11,10,15])
NZ=[0]*448
J=0
KY=bytes.fromhex('91be074e27603a3f695b15ae7254a0781649126d4f30a96481baafb897c163991c82107c3c5255a3')
TB='0'*640
def sq(u,j):
 x=ord(u[0])-97+8*int(u[1])-8
 return 63-x if j&1 else x
def nm(i,j):
 if j&1:i=63-i
 return'abcdefgh'[i%8]+str(i//8+1)
E=os.environ['MAKEFUN_ENV_URL']
def post(p,o):return json.load(U.urlopen(U.Request(E+p,json.dumps(o).encode(),{'content-type':'application/json'})))
g=post('/game',{})
while g['status']!='done':
 while g['status']=='your_move':
  b=B0;HS=set();ms=g['moves'];J=j=len(ms)
  for i,u in enumerate(ms):
   HS.add(b);b=F(M(b,sq(u,i),sq(u[2:],i),'  nbrq'.find(u[4:]or'q')))
   if i==7:kk=int.from_bytes(b,'big')%207
  if j<10:
   TT.clear();oi='2 3 4 10 25 50 1M 2M'.split().index(g['opponent'][6:8])
   NZ=random.Random(int(TB[KY.index(kk)*16+oi*2+j%2],16)).choices(range(-6,7),k=448)
   LN=int(os.environ.get('NODES',(3,4,6,25,25,25,25,25)[oi]*10000))
  L=[(sq(u,j),sq(u[2:],j))for u in g['legal_moves']if u[4:]in('','q')]
  f,t=go(b,L,LN if j<110 else LN//3)
  u=nm(f,j)+nm(t,j)
  if u+'q'in g['legal_moves']:u+='q'
  g=post('/move',{'game':g['game'],'move':u})
 g=post('/game',{})
