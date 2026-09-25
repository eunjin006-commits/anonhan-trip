export default async function handler(req) {
  if (req.method !== 'GET') return Response.json({error:'GET 요청만 지원합니다.'},{status:405});
  const input = new URL(req.url).searchParams;
  const type = input.get('type') || 'keyword', query = (input.get('query') || '').trim();
  if (!['address','keyword'].includes(type) || !query || query.length > 200)
    return Response.json({error:'검색 유형과 검색어를 확인해주세요.'},{status:400});
  const params = new URLSearchParams({query,size:type==='address'?'10':'15'});
  if (type === 'keyword') {
    const x=input.get('x'),y=input.get('y'),radius=input.get('radius');
    if ((x!==null||y!==null||radius!==null) && (x===null||y===null||x.trim()===''||y.trim()===''||!Number.isFinite(Number(x))||!Number.isFinite(Number(y))||Math.abs(Number(x))>180||Math.abs(Number(y))>90))
      return Response.json({error:'유효한 좌표가 필요합니다.'},{status:400});
    if(radius!==null&&(!Number.isFinite(Number(radius))||Number(radius)<=0||Number(radius)>20000))
      return Response.json({error:'반경은 1~20000m 사이여야 합니다.'},{status:400});
    if(x!==null){params.set('x',x);params.set('y',y);}
    if(radius!==null)params.set('radius',String(Math.round(Number(radius))));
    // 도시 검색은 정확도순으로 찾습니다. 출발지 거리순 정렬로 먼 도시가 밀리지 않습니다.
    params.set('sort','accuracy');
  }
  const key=process.env.KAKAO_REST_API_KEY;
  if(!key)return Response.json({error:'카카오 API 키가 설정되지 않았습니다.'},{status:500});
  try {
    const response=await fetch(`https://dapi.kakao.com/v2/local/search/${type}.json?${params}`,{
      headers:{Authorization:`KakaoAK ${key}`},signal:AbortSignal.timeout(10000)
    });
    if(!response.ok)return Response.json({error:response.status===429?'검색 요청 한도에 도달했습니다. 잠시 후 다시 시도해주세요.':'카카오 검색에 실패했습니다.'},{status:response.status===429?429:502});
    const data=await response.json();
    if(type==='address'){
      const first=data.documents?.[0];
      return Response.json(first?{query,found:true,x:first.x,y:first.y,address:first.address_name||first.road_address?.address_name||query}:{query,found:false});
    }
    const bannedCodes=new Set(['AD5','HP8','PM9','SC4','AC5','PS3','PK6','AG2','PO3']);
    const bannedWords=['호텔','모텔','펜션','리조트','게스트하우스','숙박','여관','민박','관리사무소','관리소','관리실','아파트','오피스텔','부동산','병원','의원','약국','학원','학교','유치원','어린이집','교회','성당','주차장','공장','사무실','관공서','주민센터'];
    const places=(data.documents||[]).filter(p=>!bannedCodes.has(p.category_group_code)&&!bannedWords.some(w=>`${p.place_name} ${p.category_name}`.replace(/\s/g,'').includes(w))).map(p=>({
      id:p.id,name:p.place_name,category:p.category_name,categoryGroup:p.category_group_name,
      categoryGroupCode:p.category_group_code,address:p.address_name||p.road_address_name,
      roadAddress:p.road_address_name,x:p.x,y:p.y,phone:p.phone,distance:Number(p.distance||0),kakaoUrl:p.place_url
    }));
    return Response.json({query,places});
  }catch(error){return Response.json({error:error.name==='TimeoutError'?'검색 응답 시간이 초과되었습니다.':'서버에서 검색을 완료하지 못했습니다.'},{status:502});}
}
