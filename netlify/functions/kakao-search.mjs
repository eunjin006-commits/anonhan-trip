export default async (req) => {
  try {
    const url = new URL(req.url);
    const query = url.searchParams.get("query");

    if (!query) {
      return Response.json(
        { error: "검색어가 필요합니다." },
        { status: 400 }
      );
    }

    const apiKey = process.env.KAKAO_REST_API_KEY;

    if (!apiKey) {
      return Response.json(
        { error: "카카오 API 키가 설정되지 않았습니다." },
        { status: 500 }
      );
    }

    const kakaoUrl =
      "https://dapi.kakao.com/v2/local/search/keyword.json" +
      "?query=" +
      encodeURIComponent(query) +
      "&size=15";

    const response = await fetch(kakaoUrl, {
      headers: {
        Authorization: `KakaoAK ${apiKey}`
      }
    });

    const data = await response.json();

    if (!response.ok) {
      return Response.json(
        {
          error: "카카오 장소 검색에 실패했습니다.",
          detail: data
        },
        { status: response.status }
      );
    }

    const places = data.documents.map(place => ({
      name: place.place_name,
      category: place.category_name,
      address: place.road_address_name || place.address_name,
      x: place.x,
      y: place.y,
      phone: place.phone,
      url: place.place_url
    }));

    return Response.json({
      query,
      places
    });

  } catch (error) {
    return Response.json(
      {
        error: "서버 오류가 발생했습니다.",
        detail: error.message
      },
      { status: 500 }
    );
  }
};
