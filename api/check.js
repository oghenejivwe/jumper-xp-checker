// GET /api/check?address=0x...  -> { address, xp, level, rank, rewards[] }
// Jumper's API rejects browser calls from other origins (403 "Not allowed by CORS"),
// so the page calls this function and the function calls Jumper server-side.

const JUMPER = 'https://api.jumper.xyz/v1';
const HEADERS = {
  Origin: 'https://jumper.xyz',
  Referer: 'https://jumper.xyz/',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140.0 Safari/537.36',
  Accept: 'application/json',
};
const EVM = /^0x[0-9a-fA-F]{40}$/;

async function jumper(path) {
  const res = await fetch(JUMPER + path, { headers: HEADERS, signal: AbortSignal.timeout(8000) });
  if (res.status === 404) return null;
  if (res.status === 429) throw Object.assign(new Error('Jumper is rate-limiting us, try again in a minute'), { status: 429 });
  if (!res.ok) throw Object.assign(new Error(`Jumper returned ${res.status}`), { status: 502 });
  return (await res.json()).data;
}

function json(body, status, cache) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': cache ? 'public, s-maxage=300, stale-while-revalidate=600' : 'no-store',
    },
  });
}

export async function GET(request) {
  const address = new URL(request.url).searchParams.get('address')?.trim() ?? '';
  if (!EVM.test(address)) return json({ error: 'Not a valid EVM address' }, 400, false);

  try {
    const [rewards, board] = await Promise.all([
      jumper(`/wallets/${address}/rewards`),
      jumper(`/leaderboard/${address}`),
    ]);
    return json(
      {
        address,
        xp: Number(rewards?.sum ?? board?.points ?? 0),
        level: rewards?.level ?? 0,
        rank: board ? Number(board.position) : null,
        rewards: (rewards?.walletRewards ?? []).map((r) => ({
          name: r.reward?.name ?? r.reward?.type ?? 'Reward',
          points: r.points,
          ongoing: !!r.ongoing,
        })),
      },
      200,
      true,
    );
  } catch (err) {
    return json({ error: err.message }, err.status ?? 502, false);
  }
}
