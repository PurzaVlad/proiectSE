const form = document.getElementById("expertForm");
const resultCard = document.getElementById("resultCard");
const mainRecommendation = document.getElementById("mainRecommendation");
const sportDescription = document.getElementById("sportDescription");
const reasonList = document.getElementById("reasonList");
const rankingList = document.getElementById("rankingList");
const appliedBiasList = document.getElementById("appliedBiasList");
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
  return {
    activityLevel: formData.get("activityLevel"),
    fitnessLevel: formData.get("fitnessLevel"),
    environment: formData.get("environment"),
    time: formData.get("time"),
    style: formData.get("style"),
    goal: formData.get("goal"),
    jointIssues: formData.get("jointIssues"),
    coordination: formData.get("coordination")
  };
}

function initializeScores(sportsMeta, baseBias = {}) {
  return Object.keys(sportsMeta).reduce((acc, sportKey) => {
    acc[sportKey] = baseBias[sportKey] || 0;
    return acc;
  }, {});
}

function computeMaxScores(criteria, sportsMeta, baseBias = {}) {
  const maxScores = initializeScores(sportsMeta, baseBias);

  for (const criterion of Object.values(criteria)) {
    for (const sportKey of Object.keys(sportsMeta)) {
      let bestForCriterion = 0;

      for (const option of Object.values(criterion.options || {})) {
        const candidate = option.bias?.[sportKey] || 0;
        if (candidate > bestForCriterion) {
          bestForCriterion = candidate;
        }
      }

      maxScores[sportKey] += bestForCriterion;
    }
  }

  return maxScores;
}

function scoreWithBias(facts, kb) {
  const scores = initializeScores(kb.sports, kb.baseBias);
  const explanations = [];
  const appliedCriteria = [];

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

    const topImpacts = biasEntries
      .filter(([, delta]) => delta > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([sportKey, delta]) => `${kb.sports[sportKey].label} +${delta}`)
      .join(", ");

    if (topImpacts) {
      appliedCriteria.push(`${criterion.label}: ${option.label} -> ${topImpacts}`);
    }

    for (const [sportKey, delta] of biasEntries) {
      scores[sportKey] = (scores[sportKey] || 0) + delta;
      explanations.push({
        sport: sportKey,
        reason: `${criterion.label}: ${option.label}`,
        delta
      });
    }
  }

  return { scores, explanations, appliedCriteria };
}

function buildTopRecommendations(scores, maxScores, sportsMeta, limit = 5) {
  return Object.keys(sportsMeta)
    .map((sportKey) => {
      const score = scores[sportKey] || 0;
      const maxScore = maxScores[sportKey] || 1;
      const percentage = Math.min(100, (score / maxScore) * 100);

      return {
        sport: sportKey,
        score,
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

function renderResult(topRecommendations, explanations, appliedCriteria, sportsMeta) {
  reasonList.innerHTML = "";
  rankingList.innerHTML = "";
  appliedBiasList.innerHTML = "";

  appliedCriteria.forEach((line) => {
    const li = document.createElement("li");
    li.textContent = line;
    appliedBiasList.appendChild(li);
  });

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

  explanations
    .filter((item) => item.sport === top.sport)
    .sort((a, b) => b.delta - a.delta)
    .forEach((item) => {
      const li = document.createElement("li");
      li.textContent = `${item.reason} (+${item.delta})`;
      reasonList.appendChild(li);
    });

  topRecommendations.forEach(({ sport, score, maxScore, percentage }) => {
    const li = document.createElement("li");
    li.textContent = `${sportsMeta[sport].label} - ${percentage.toFixed(1)}% (scor ${score}/${maxScore})`;
    rankingList.appendChild(li);
  });

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
  const { scores, explanations, appliedCriteria } = scoreWithBias(facts, knowledgeBase);
  const maxScores = computeMaxScores(knowledgeBase.criteria || {}, knowledgeBase.sports, knowledgeBase.baseBias || {});
  const topRecommendations = buildTopRecommendations(scores, maxScores, knowledgeBase.sports, 5);

  renderResult(topRecommendations, explanations, appliedCriteria, knowledgeBase.sports);
});

resetBtn.addEventListener("click", () => {
  resultCard.classList.add("hidden");
  reasonList.innerHTML = "";
  rankingList.innerHTML = "";
  appliedBiasList.innerHTML = "";
  mainRecommendation.textContent = "";
  sportDescription.textContent = "";
});

loadKnowledgeBase().catch((error) => {
  console.error(error);
  alert("Eroare la incarcarea bazei de cunostinte.");
});
