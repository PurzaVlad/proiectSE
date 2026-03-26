const form = document.getElementById("expertForm");
const resultCard = document.getElementById("resultCard");
const mainRecommendation = document.getElementById("mainRecommendation");
const sportDescription = document.getElementById("sportDescription");
const rankingList = document.getElementById("rankingList");
const appliedBiasTableHead = document.getElementById("appliedBiasTableHead");
const appliedBiasTableBody = document.getElementById("appliedBiasTableBody");
const resetBtn = document.getElementById("resetBtn");

let knowledgeBase = null;

async function loadKnowledgeBase() {
  const candidates = [
    "knowledge-base.json",
    "./knowledge-base.json",
    "/knowledge-base.json"
  ];

  let lastError = null;

  for (const path of candidates) {
    try {
      const response = await fetch(path, { cache: "no-store" });
      if (!response.ok) {
        lastError = new Error(`HTTP ${response.status} pentru ${path}`);
        continue;
      }

      knowledgeBase = await response.json();
      return;
    } catch (error) {
      lastError = error;
    }
  }

  throw new Error(
    `Nu s-a putut incarca baza de cunostinte. Ultima eroare: ${lastError ? lastError.message : "necunoscuta"}`
  );
}

function collectFacts(formData) {
  return Object.fromEntries(formData.entries());
}

function initializeScores(sportsMeta, baseBias = {}) {
  return Object.keys(sportsMeta).reduce((acc, sportKey) => {
    acc[sportKey] = baseBias[sportKey] || 0;
    return acc;
  }, {});
}

function computeGlobalScoreRange(facts, kb) {
  const sportKeys = Object.keys(kb.sports || {});
  const baseValues = sportKeys.map((sportKey) => kb.baseBias?.[sportKey] || 0);

  const minBase = baseValues.length > 0 ? Math.min(...baseValues) : 0;
  const maxBase = baseValues.length > 0 ? Math.max(...baseValues) : 0;

  let minDeltaSum = 0;
  let maxDeltaSum = 0;

  for (const [factKey, factValue] of Object.entries(facts)) {
    const option = kb.criteria?.[factKey]?.options?.[factValue];
    if (!option) {
      continue;
    }

    const deltas = sportKeys.map((sportKey) => option.bias?.[sportKey] || 0);
    if (deltas.length === 0) {
      continue;
    }

    minDeltaSum += Math.min(...deltas);
    maxDeltaSum += Math.max(...deltas);
  }

  return {
    minScore: minBase + minDeltaSum,
    maxScore: maxBase + maxDeltaSum
  };
}

function scoreWithBias(facts, kb) {
  const scores = initializeScores(kb.sports, kb.baseBias);
  const criteriaRows = [];

  for (const [factKey, factValue] of Object.entries(facts)) {
    const criterion = kb.criteria?.[factKey];
    if (!criterion) {
      continue;
    }

    const option = criterion.options?.[factValue];
    if (!option) {
      continue;
    }

    const biasEntries = Object.entries(option.bias || {});
    if (biasEntries.length === 0) {
      continue;
    }

    criteriaRows.push({
      criterionLabel: criterion.label,
      optionLabel: option.label,
      biases: option.bias || {}
    });

    for (const [sportKey, delta] of biasEntries) {
      scores[sportKey] = (scores[sportKey] || 0) + delta;
    }
  }

  return { scores, criteriaRows };
}

function buildTopRecommendations(scores, scoreRange, sportsMeta, limit = 5) {
  const minScore = scoreRange.minScore ?? 0;
  const maxScore = scoreRange.maxScore ?? 1;
  const span = Math.max(1, maxScore - minScore);

  return Object.keys(sportsMeta)
    .map((sportKey) => {
      const score = scores[sportKey] || 0;
      const rawPercentage = ((score - minScore) / span) * 100;
      const percentage = Math.min(100, Math.max(0, rawPercentage));

      return {
        sport: sportKey,
        score,
        minScore,
        maxScore,
        percentage
      };
    })
    .sort((a, b) => {
      if (b.percentage !== a.percentage) {
        return b.percentage - a.percentage;
      }
      return b.score - a.score;
    })
    .slice(0, limit);
}

function getTopSportsByTotalScore(scores, sportsMeta, limit = 10) {
  return Object.keys(sportsMeta)
    .map((sportKey) => ({
      sport: sportKey,
      score: scores[sportKey] || 0
    }))
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      return sportsMeta[a.sport].label.localeCompare(sportsMeta[b.sport].label, "ro");
    })
    .slice(0, limit);
}

function formatDelta(delta) {
  if (delta > 0) {
    return `+${delta}`;
  }
  return `${delta}`;
}

function renderCriteriaTable(topSports, criteriaRows, scores, sportsMeta) {
  appliedBiasTableHead.innerHTML = "";
  appliedBiasTableBody.innerHTML = "";

  if (topSports.length === 0) {
    return;
  }

  const headerRow = document.createElement("tr");
  const criterionHeader = document.createElement("th");
  criterionHeader.textContent = "Criteriu";
  headerRow.appendChild(criterionHeader);

  topSports.forEach(({ sport }) => {
    const th = document.createElement("th");
    th.textContent = sportsMeta[sport].label;
    headerRow.appendChild(th);
  });

  appliedBiasTableHead.appendChild(headerRow);

  criteriaRows.forEach((row) => {
    const tr = document.createElement("tr");
    const rowLabel = document.createElement("th");
    rowLabel.textContent = `${row.criterionLabel} (${row.optionLabel})`;
    tr.appendChild(rowLabel);

    topSports.forEach(({ sport }) => {
      const td = document.createElement("td");
      const delta = row.biases[sport] ?? 0;
      td.textContent = formatDelta(delta);
      if (delta > 0) {
        td.className = "delta-positive";
      } else if (delta < 0) {
        td.className = "delta-negative";
      } else {
        td.className = "delta-zero";
      }
      tr.appendChild(td);
    });

    appliedBiasTableBody.appendChild(tr);
  });

  const totalRow = document.createElement("tr");
  totalRow.className = "total-row";
  const totalLabel = document.createElement("th");
  totalLabel.textContent = "Total";
  totalRow.appendChild(totalLabel);

  topSports.forEach(({ sport }) => {
    const td = document.createElement("td");
    td.textContent = `${scores[sport] || 0}`;
    totalRow.appendChild(td);
  });

  appliedBiasTableBody.appendChild(totalRow);
}

function renderResult(topRecommendations, criteriaRows, scores, sportsMeta) {
  rankingList.innerHTML = "";
  appliedBiasTableHead.innerHTML = "";
  appliedBiasTableBody.innerHTML = "";

  if (topRecommendations.length === 0) {
    mainRecommendation.textContent = "Nu exista recomandari disponibile.";
    sportDescription.textContent = "Verifica baza de cunostinte.";
    resultCard.classList.remove("hidden");
    return;
  }

  const top = topRecommendations[0];
  const topMeta = sportsMeta[top.sport];

  mainRecommendation.textContent = `Top recomandare: ${topMeta.label} (${top.percentage.toFixed(1)}% potrivire)`;
  sportDescription.textContent = topMeta.description;

  topRecommendations.forEach(({ sport, score, maxScore, percentage }) => {
    const li = document.createElement("li");
    li.textContent = `${sportsMeta[sport].label} - ${percentage.toFixed(1)}% (scor ${score}/${maxScore})`;
    rankingList.appendChild(li);
  });

  const topSportsForTable = getTopSportsByTotalScore(scores, sportsMeta, 10);
  renderCriteriaTable(topSportsForTable, criteriaRows, scores, sportsMeta);

  resultCard.classList.remove("hidden");
}

form.addEventListener("submit", (event) => {
  event.preventDefault();

  if (!knowledgeBase) {
    alert("Baza de cunostinte nu este disponibila inca.");
    return;
  }

  if (knowledgeBase.approach !== "bias_scoring") {
    alert("Baza de cunostinte incarcata nu foloseste modelul bias_scoring.");
    return;
  }

  const formData = new FormData(form);
  const facts = collectFacts(formData);
  const { scores, criteriaRows } = scoreWithBias(facts, knowledgeBase);
  const scoreRange = computeGlobalScoreRange(facts, knowledgeBase);
  const topRecommendations = buildTopRecommendations(scores, scoreRange, knowledgeBase.sports, 5);

  renderResult(topRecommendations, criteriaRows, scores, knowledgeBase.sports);
});

resetBtn.addEventListener("click", () => {
  resultCard.classList.add("hidden");
  rankingList.innerHTML = "";
  appliedBiasTableHead.innerHTML = "";
  appliedBiasTableBody.innerHTML = "";
  mainRecommendation.textContent = "";
  sportDescription.textContent = "";
});

loadKnowledgeBase().catch((error) => {
  console.error(error);
  alert("Eroare la incarcarea bazei de cunostinte.");
});
