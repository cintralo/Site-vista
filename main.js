/* =============================================================================
   VISTA — HOSPITAL DA CATARATA · Hero
   Timeline única de entrada + microinterações. Sem dependências além de
   GSAP 3.13 e SplitText 3.13 (ambos declarados no <head> com SRI).
   ========================================================================== */
(function () {
  'use strict';

  var root = document.documentElement;
  var reduceMQ = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* Mostra TUDO em estado final — Hero e segunda dobra. Usado por: movimento
     reduzido, ausência de GSAP (CDN bloqueado) e o watchdog de segurança. */
  function showEverything() {
    root.classList.remove('js-anim');
    root.classList.remove('js-reveal');
  }

  /* Só a Hero. Chamada no fim da timeline de entrada: js-reveal precisa
     sobreviver, senão os cards da segunda dobra apareceriam de uma vez ali. */
  function heroDone() {
    root.classList.remove('js-anim');
  }

  /* Se o usuário pede movimento reduzido, ou o GSAP não chegou, não há timeline:
     o conteúdo já está visível (a classe .js-anim nem foi adicionada, ou sai aqui). */
  if (reduceMQ.matches || !window.gsap) {
    showEverything();
    return;
  }

  var gsap = window.gsap;

  var media    = document.querySelector('.hero__media');
  var photo    = document.querySelector('.hero__photo');
  var headline = document.querySelector('.headline');
  var lineSpans = headline ? headline.querySelectorAll('.headline__line') : [];
  var eyebrowText = document.querySelector('.eyebrow__text');

  var el = function (sel) { return document.querySelector(sel); };

  /* Rede de segurança: se algo travar antes da timeline começar, o conteúdo
     aparece sozinho em 2,5 s. Uma Hero invisível é pior que uma Hero sem animação. */
  var watchdog = setTimeout(showEverything, 2500);

  /* --------------------------------------------------------------------------
     Espera fontes + imagem antes de medir/animar.
     Por que: o SplitText corta as linhas na largura RENDERIZADA — se ele rodar
     com a fonte de fallback, o corte sai errado quando a Archivo troca. E o
     reveal por clip-path sobre uma imagem ainda não decodificada mostra vazio.
     A corrida com timeout impede que uma fonte lenta segure a página.
     -------------------------------------------------------------------------- */
  function ready() {
    var jobs = [];

    if (document.fonts && document.fonts.ready) jobs.push(document.fonts.ready);

    if (photo) {
      jobs.push(photo.complete && photo.naturalWidth
        ? Promise.resolve()
        : new Promise(function (res) {
            photo.addEventListener('load', res, { once: true });
            photo.addEventListener('error', res, { once: true });
          }));
    }

    var timeout = new Promise(function (res) { setTimeout(res, 1600); });
    return Promise.race([Promise.all(jobs), timeout]);
  }

  ready().then(build);

  /* ========================== TIMELINE DE ENTRADA ========================== */
  function build() {
    clearTimeout(watchdog);

    /* --- Headline por linhas ---
       Com SplitText: mask:"lines" cria os wrappers overflow:hidden em cima das
       linhas realmente renderizadas. Sem ele: caio nos .line-mask que já estão
       no HTML — mesmo efeito, sem uma requisição extra de fallback. */
    var split = null;
    var lines = lineSpans;

    if (window.SplitText) {
      try {
        gsap.registerPlugin(window.SplitText);
        split = new window.SplitText(headline, { type: 'lines', mask: 'lines' });
        headline.classList.add('is-split');   // desliga as máscaras estáticas
        lines = split.lines;
      } catch (e) {
        split = null;
        lines = lineSpans;
      }
    }
    /* Depois do split, e não antes: o SplitText reconstrói o DOM da headline, e
       os spans clonados voltam a casar com `.js-anim .headline__line{opacity:0}`.
       Setar os spans originais aqui deixaria a headline invisível. */
    gsap.set(headline.querySelectorAll('.headline__line'), { opacity: 1 });

    /* Letter-spacing final lido do CSS (px), para o tween não depender de um
       valor hard-coded que divergiria do token --tracking-widest. */
    var eyebrowLS = eyebrowText
      ? window.getComputedStyle(eyebrowText).letterSpacing
      : '0px';

    var tl = gsap.timeline({
      defaults: { ease: 'power3.out' },
      onComplete: function () {
        /* Devolve o DOM da headline ao original: sem isso, as linhas ficariam
           congeladas na largura do momento do split e quebrariam num resize. */
        if (split) { split.revert(); headline.classList.remove('is-split'); }
        /* Fim da timeline = estado final da Hero. Tirar .js-anim remove os
           estados iniciais do CSS — indispensável depois do revert(), que
           devolve os spans originais e os faria casar de novo com opacity:0. */
        heroDone();
        gsap.set([photo, media], { clearProps: 'willChange' });
        initParallax();
      }
    });

    /* 1 · Foto: reveal por clip-path da esquerda para a direita + escala 1.08→1 */
    tl.fromTo(media,
        { clipPath: 'inset(0 100% 0 0)' },
        { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.2, ease: 'expo.out' }, 0)
      .fromTo(photo,
        { scale: 1.08 },
        { scale: 1, duration: 1.6, ease: 'power2.out' }, 0)

    /* 2 · Logo */
      .fromTo(el('[data-anim="logo"]'),
        { opacity: 0, y: -12 },
        { opacity: 1, y: 0, duration: 0.6 }, 0.25)

    /* 3 · Eyebrow: letter-spacing abrindo de 0.5em até o valor do token */
      .fromTo(el('[data-anim="eyebrow"]'),
        { opacity: 0 },
        { opacity: 1, duration: 0.8 }, 0.35)
      .fromTo(eyebrowText,
        { letterSpacing: '0.5em' },
        { letterSpacing: eyebrowLS, duration: 1.1, ease: 'power2.out' }, 0.35)

    /* 4 · Headline: linha a linha, de baixo para cima, dentro da máscara */
      .fromTo(lines,
        { yPercent: 110 },
        { yPercent: 0, duration: 0.95, stagger: 0.08, ease: 'power4.out' }, 0.45)

    /* 5 · Parágrafo */
      .fromTo(el('[data-anim="lede"]'),
        { opacity: 0, y: 16 },
        { opacity: 1, y: 0, duration: 0.7 }, 0.78)

    /* 6 · Botões e pills */
      .fromTo('.actions .btn',
        { opacity: 0, y: 14, scale: 0.96 },
        { opacity: 1, y: 0, scale: 1, duration: 0.6, stagger: 0.07 }, 0.9)
      .fromTo('.pills .pill',
        { opacity: 0, y: 10, scale: 0.96 },
        { opacity: 1, y: 0, scale: 1, duration: 0.55, stagger: 0.06 }, 1.04)

    /* Elementos de apoio */
      .fromTo(el('[data-anim="credit"]'),
        { opacity: 0, x: -12 },
        { opacity: 1, x: 0, duration: 0.6 }, 1.0)
      .fromTo(el('[data-anim="cue"]'),
        { opacity: 0, y: -8 },
        { opacity: 1, y: 0, duration: 0.6 }, 1.2);

    /* Os wrappers .actions e .pills carregam opacity:0 do CSS; quem anima são os
       filhos, então libero os contêineres junto com a entrada deles. */
    gsap.set(['[data-anim="actions"]', '[data-anim="pills"]'], { opacity: 1 });

    initSectionReveals();

    /* Se o usuário ligar "reduzir movimento" no meio da sessão, salta pro fim. */
    var onPrefChange = function (e) { if (e.matches) { tl.progress(1); } };
    if (reduceMQ.addEventListener) reduceMQ.addEventListener('change', onPrefChange);
  }

  /* ==================== REVEALS DA SEGUNDA DOBRA =========================== */
  /* Entradas disparadas por scroll. Os tweens escrevem transform inline nos
     <li data-reveal="card">, e não nos .svc__card — que é onde mora o
     transform de hover no CSS. Elementos diferentes, sem sobrescrita: inline
     style de animação em cima de um elemento que também tem transform no CSS
     é justamente o tipo de conflito que passa despercebido. */
  function initSectionReveals() {
    if (!window.ScrollTrigger) {
      /* GSAP veio mas o plugin não: mostra a seção em vez de deixá-la oculta. */
      root.classList.remove('js-reveal');
      return;
    }
    gsap.registerPlugin(window.ScrollTrigger);

    var headTrigger = { trigger: '.services__head', start: 'top 78%', once: true };

    /* Título por linhas, dentro das máscaras (mesma gramática da Hero) */
    gsap.fromTo('.services__line',
      { yPercent: 110, opacity: 1 },
      { yPercent: 0, duration: 0.9, stagger: 0.08, ease: 'power4.out',
        immediateRender: true, scrollTrigger: headTrigger });

    /* Parágrafo de apoio e cápsulas */
    gsap.fromTo('[data-reveal="lede"], [data-reveal="nav"]',
      { opacity: 0, y: 16 },
      { opacity: 1, y: 0, duration: 0.7, stagger: 0.08, ease: 'power3.out',
        immediateRender: true, scrollTrigger: headTrigger });

    /* Cards, em cascata */
    gsap.fromTo('[data-reveal="card"]',
      { opacity: 0, y: 24, scale: 0.98 },
      { opacity: 1, y: 0, scale: 1, duration: 0.7, stagger: 0.1,
        ease: 'power3.out', immediateRender: true,
        scrollTrigger: { trigger: '.services__grid', start: 'top 85%', once: true } });
  }

  /* ========================= PARALLAX DE MOUSE ============================= */
  /* Só em ponteiro fino com hover — em touch não existe "seguir o mouse", e em
     trackpad grosseiro o efeito vira tremor. Máximo de 12px, interpolado por
     quickTo: uma função pré-compilada que reaproveita o mesmo tween a cada
     movimento, em vez de escrever style no evento (o que serrilharia). */
  function initParallax() {
    if (!photo) return;
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    if (reduceMQ.matches) return;

    var MAX = 12;
    var xTo = gsap.quickTo(photo, 'x', { duration: 0.9, ease: 'power3' });
    var yTo = gsap.quickTo(photo, 'y', { duration: 0.9, ease: 'power3' });

    gsap.set(photo, { willChange: 'transform' });

    window.addEventListener('pointermove', function (e) {
      var nx = (e.clientX / window.innerWidth) * 2 - 1;   /* -1 … 1 */
      var ny = (e.clientY / window.innerHeight) * 2 - 1;
      /* eixo X invertido: a foto contra-move o cursor, o que lê como profundidade */
      xTo(-nx * MAX);
      yTo(-ny * (MAX * 0.6));
    }, { passive: true });

    /* Cursor saiu da janela: volta ao repouso em vez de congelar torto. */
    document.addEventListener('mouseleave', function () { xTo(0); yTo(0); });
  }
})();
