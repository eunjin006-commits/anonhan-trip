export default async (req) => {
  try {
    const url = new URL(req.url);

    const type = url.searchParams.get("type") || "keyword";
    const query = url.searchParams.get("query");

    const x = url.searchParams.get("x");
    const y = url.searchParams.get("y");
    const radius = url.searchParams.get("radius");

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

    let kakaoUrl = "";

    // 출발지역 → 좌표 찾기
    if (type === "address") {
      kakaoUrl =
        "https://dapi.kakao.com/v2/local/search/address.json" +
        "?query=" +
        encodeURIComponent(query);
    }

    // 실제 장소 검색
    else {
      const params = new URLSearchParams();

      params.set("query", query);
      params.set("size", "15");
      params.set("sort", "distance");

      if (x && y) {
        params.set("x", x);
        params.set("y", y);
      }

      if (radius) {
        params.set(
          "radius",
          String(Math.min(Number(radius), 20000))
        );
      }

      kakaoUrl =
        "https://dapi.kakao.com/v2/local/search/keyword.json?" +
        params.toString();
    }

    const response = await fetch(kakaoUrl, {
      headers: {
        Authorization: `KakaoAK ${apiKey}`
      }
    });

    const data = await response.json();

    if (!response.ok) {
      return Response.json(
        {
          error: "카카오 검색에 실패했습니다.",
          detail: data
        },
        { status: response.status }
      );
    }

    // 주소 검색
    if (type === "address") {
      const first = data.documents?.[0];

      if (!first) {
        return Response.json({
          query,
          found: false
        });
      }

      return Response.json({
        query,
        found: true,
        x: first.x,
        y: first.y,
        address:
          first.address_name ||
          first.road_address?.address_name ||
          query
      });
    }

    // 장소 검색
    const places = (data.documents || []).map(place => ({
      id: place.id,
      name: place.place_name,
      category: place.category_name,
      categoryGroup: place.category_group_name,
      address:
        place.road_address_name ||
        place.address_name,
      x: place.x,
      y: place.y,
      phone: place.phone,
      distance: Number(place.distance || 0),
      kakaoUrl: place.place_url
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
