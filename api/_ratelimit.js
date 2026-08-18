// Simple per-IP rate limiting for the serverless endpoints.
//
// Scope and honest limitations: Vercel functions are ephemeral and several
// instances can run in parallel, so this in-memory counter is a speed bump,
// not a wall. It reliably stops the realistic attack — one machine hammering
// /api/login to guess the password, or a scraper pulling the catalog in a
// loop — because those hit the same warm instance repeatedly. It does NOT
// stop a distributed attacker rotating IPs. Making it airtight needs durable
// shared storage (Vercel KV / Upstash / Redis), which this project has no
// need to take on today.

var buckets = Object.create(null);

function clientIp(req) {
  var fwd = req.headers && (req.headers['x-forwarded-for'] || req.headers['x-real-ip']);
  if (!fwd) return 'unknown';
  return String(fwd).split(',')[0].trim();
}

function sweep(now) {
  // Keep memory bounded — drop windows nobody has touched in a while.
  for (var key in buckets) {
    if (buckets[key].resetAt < now - 60000) delete buckets[key];
  }
}

// Returns { allowed, retryAfter } and records the hit when allowed.
function hit(req, name, limit, windowMs) {
  var now = Date.now();
  if (Math.random() < 0.02) sweep(now);

  var key = name + ':' + clientIp(req);
  var b = buckets[key];

  if (!b || b.resetAt <= now) {
    buckets[key] = { count: 1, resetAt: now + windowMs };
    return { allowed: true };
  }

  b.count++;
  if (b.count > limit) {
    return { allowed: false, retryAfter: Math.ceil((b.resetAt - now) / 1000) };
  }
  return { allowed: true };
}

// Guard helper: answers 429 itself and returns false when over the limit.
function enforce(req, res, name, limit, windowMs) {
  var r = hit(req, name, limit, windowMs);
  if (!r.allowed) {
    res.setHeader('Retry-After', String(r.retryAfter));
    res.status(429).json({
      error: 'Muitas requisições. Tente novamente em ' + r.retryAfter + 's.',
    });
    return false;
  }
  return true;
}

// A successful login clears the failure counter so normal use never locks out.
function reset(req, name) {
  delete buckets[name + ':' + clientIp(req)];
}

module.exports = { enforce, reset, clientIp };
