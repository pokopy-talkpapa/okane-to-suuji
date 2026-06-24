(function (root) {
  function splitDigits(n) {
    return {
      h: Math.floor(n / 100) % 10,
      t: Math.floor(n / 10) % 10,
      o: n % 10,
    };
  }

  function coinsToNumber({ h, t, o }) {
    return h * 100 + t * 10 + o;
  }

  function checkAnswer(answer, target) {
    return coinsToNumber(answer) === target;
  }

  function generateProblem(prev) {
    let n;
    do {
      const h = 1 + Math.floor(Math.random() * 9);
      const t = Math.floor(Math.random() * 10);
      const o = Math.floor(Math.random() * 10);
      n = h * 100 + t * 10 + o;
    } while (n === prev);
    return n;
  }

  // mode3専用: 前の問題と1つの位だけ違う問題を生成する
  function generateMode3Problem(prev) {
    const d = splitDigits(prev);
    const places = ['h', 't', 'o'];
    for (let attempt = 0; attempt < 30; attempt++) {
      const place = places[Math.floor(Math.random() * 3)];
      const nd = { h: d.h, t: d.t, o: d.o };
      let v;
      do {
        v = place === 'h' ? 1 + Math.floor(Math.random() * 9) : Math.floor(Math.random() * 10);
      } while (v === d[place]);
      nd[place] = v;
      const n = nd.h * 100 + nd.t * 10 + nd.o;
      if (n !== prev) return n;
    }
    return generateProblem(prev);
  }

  const api = { splitDigits, coinsToNumber, checkAnswer, generateProblem, generateMode3Problem };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else Object.assign(root, api);
})(typeof window !== 'undefined' ? window : globalThis);
