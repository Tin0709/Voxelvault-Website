
import TopLink from '../components/ui/TopLink';
import {useApi} from '../lib/useApi';
import Icon from '../components/ui/Icon';
import HeroQuote from '../components/home/HeroQuote';
import ShowcaseDeck from '../components/home/ShowcaseDeck';
import LatestCreations from '../components/home/LatestCreations';
import compass from '../assets/home/compass.svg';
import rainbow from '../assets/home/story-pen.svg';
import slime from '../assets/home/slime.svg';
export default function HomePage(){
 const {data,loading,error}=useApi('/posts?limit=50');
 const posts=data?.posts||[];

 return <main className="vv-home mx-auto w-full max-w-[1500px] px-6 pb-20 lg:px-10">
  <section className="vv-home-hero">
   <HeroQuote/>
   <ShowcaseDeck posts={posts} loading={loading}/>
  </section>
  <section className="vv-home-principles vv-home-principles-animated" aria-label="Your creative archive">{[[compass,'Discover something extraordinary','Explore the details, find a new perspective, and meet the creators behind every world.'],[rainbow,'Tell the whole story','Bring your builds to life with galleries, descriptions, and credit where it belongs.'],[slime,'Make space for your ideas','Keep your post images and private build files together in your own creative vault.']].map(([image,title,text])=><article key={title}><img src={image} alt="" className="vv-principle-art"/><h2>{title}</h2><p>{text}</p></article>)}</section>
  <LatestCreations posts={posts} loading={loading} error={error}/>
  <section className="vv-home-invitation vv-invitation-animated"><svg className="vv-invitation-border" aria-hidden="true" width="100%" height="100%"><rect x="1" y="1" width="calc(100% - 2px)" height="calc(100% - 2px)" rx="24"/></svg><div className="vv-invitation-grid" aria-hidden="true"/><div className="vv-invitation-particles" aria-hidden="true"><i/><i/><i/><i/></div><div className="vv-invitation-copy"><p className="vv-home-eyebrow"><span/> EVERY BLOCK HAS A STORY</p><h2>What will you build next?</h2><p>Your next idea deserves a place in the vault. Share your world, tell its story, and inspire the next creation.</p></div><TopLink to="/create" className="vv-home-primary">Create your post <Icon name="plus"/></TopLink></section>
 </main>;
}
