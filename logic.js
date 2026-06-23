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

  const api = { splitDigits, coinsToNumber, checkAnswer, generateProblem };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else Object.assign(root, api);
})(typeof window !== 'undefined' ? window : globalThis);
