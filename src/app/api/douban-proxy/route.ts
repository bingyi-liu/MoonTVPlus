import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// 只允许豆瓣域名，防止被当成开放代理滥用
const ALLOWED = [
  /^https:\/\/m\.douban\.com\//,
  /^https:\/\/movie\.douban\.com\//,
  /^https:\/\/api\.douban\.com\//,
];

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function GET(request: NextRequest) {
  const target = request.nextUrl.searchParams.get('url');

  if (!target) {
    return NextResponse.json({ error: 'missing url' }, { status: 400, headers: CORS });
  }
  if (!ALLOWED.some((re) => re.test(target))) {
    return NextResponse.json({ error: 'domain not allowed' }, { status: 403, headers: CORS });
  }

  try {
    const res = await fetch(target, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        // 浏览器不允许前端设置 Referer，必须在这里补
        Referer: 'https://movie.douban.com/',
        Accept: 'application/json, text/plain, */*',
      },
      // Vercel 侧缓存 10 分钟
      next: { revalidate: 600 },
    });

    const body = await res.text();

    return new NextResponse(body, {
      status: res.status,
      headers: {
        ...CORS,
        'Content-Type':
          res.headers.get('content-type') ?? 'application/json; charset=utf-8',
        'Cache-Control':
          'public, max-age=600, s-maxage=600, stale-while-revalidate=1800',
      },
    });
  } catch {
    return NextResponse.json(
      { error: 'upstream fetch failed' },
      { status: 502, headers: CORS }
    );
  }
}
