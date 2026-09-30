const categories = [
  { id: "all", label: "All builds" },
  { id: "architecture", label: "Architecture" },
  { id: "landscapes", label: "Landscapes" },
  { id: "survival", label: "Survival" },
  { id: "fantasy", label: "Fantasy" },
  { id: "redstone", label: "Redstone" },
];

export function categoryOptions(custom=[]){return [...categories,...[...new Set(custom)].filter(id=>!categories.some(c=>c.id===id)).map(id=>({id,label:id}))];}
export function categorySuggestions(options,query){const fold=value=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/Đ/g,'D').toLowerCase();const q=fold(query.trim());return q?options.filter(c=>c.id!=='all'&&fold(c.label).includes(q)).slice(0,4).map(c=>({id:'category:'+c.id,title:c.label,categoryId:c.id,type:'category'})):[];}
