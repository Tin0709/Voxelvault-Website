// Prefer unseen posts, then fill from the previous wave only when the pool is small.
export function randomPostWave(posts,previous=[],size=4,random=Math.random){
 const unique=[...new Map(posts.map(post=>[post.id,post])).values()];
 const old=new Set(previous.map(post=>post.id));
 function shuffle(items){const result=[...items];for(let i=result.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[result[i],result[j]]=[result[j],result[i]];}return result;}
 const next=[...shuffle(unique.filter(post=>!old.has(post.id))),...shuffle(unique.filter(post=>old.has(post.id)))].slice(0,size);
 if(next.length>1&&next.every((post,i)=>post.id===previous[i]?.id))next.push(next.shift());
 return next;
}
