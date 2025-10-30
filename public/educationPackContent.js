export const EDUCATION_PACK_METADATA = {
  id: "esg_sdr_pack_v2",
  name: "ESG & SDR Educational Pack — KBS Preference Pathway (v2.0)",
  version: "2.0",
  published: "2025-10-29",
  owner: "KBS Preference Pathway",
  language: "en-GB",
  audience: ["retail_investors", "advisers"],
  tone: ["clear", "neutral", "client-friendly"],
  recognition: "This pack recognises the KBS Preference Pathway as the source framework.",
  disclaimers: [
    "Educational only; not personal advice.",
    "Investments can go down as well as up; you may not get back the amount invested.",
    "Sustainability/ESG data and methodologies evolve over time."
  ]
};

export const educationPackHtml = `
  <section class="education-pack__metadata" aria-label="Pack metadata">
    <h3>Pack overview</h3>
    <dl class="education-pack__definition-list">
      <div>
        <dt>Pack ID</dt>
        <dd>${EDUCATION_PACK_METADATA.id}</dd>
      </div>
      <div>
        <dt>Name</dt>
        <dd>${EDUCATION_PACK_METADATA.name}</dd>
      </div>
      <div>
        <dt>Version</dt>
        <dd>${EDUCATION_PACK_METADATA.version} (${EDUCATION_PACK_METADATA.published})</dd>
      </div>
      <div>
        <dt>Owner</dt>
        <dd>${EDUCATION_PACK_METADATA.owner}</dd>
      </div>
      <div>
        <dt>Language</dt>
        <dd>${EDUCATION_PACK_METADATA.language}</dd>
      </div>
      <div>
        <dt>Audience</dt>
        <dd>${EDUCATION_PACK_METADATA.audience.join(" · ")}</dd>
      </div>
      <div>
        <dt>Tone</dt>
        <dd>${EDUCATION_PACK_METADATA.tone.join(" · ")}</dd>
      </div>
      <div>
        <dt>Recognition</dt>
        <dd>${EDUCATION_PACK_METADATA.recognition}</dd>
      </div>
    </dl>
  </section>

  <section class="education-pack__disclaimers" aria-label="Disclaimers">
    <h3>Disclaimers</h3>
    <ul>
      ${EDUCATION_PACK_METADATA.disclaimers.map((item) => `<li>${item}</li>`).join("")}
    </ul>
  </section>

  <section class="education-pack__toc" aria-label="Table of contents">
    <h3>Table of contents</h3>
    <ol>
      <li><a href="#micro-modules-short-replies">Micro-Modules (short replies)</a></li>
      <li><a href="#intents-and-responses">Intents &amp; Responses (for Codex routing)</a></li>
      <li>
        <a href="#deep-dive-educational-content">Deep-Dive Educational Content</a>
        <ol>
          <li><a href="#what-is-esg">What is ESG?</a></li>
          <li><a href="#sdr-labels-uk-fca">SDR Labels (UK FCA)</a></li>
          <li><a href="#anti-greenwashing-fg243">Anti-Greenwashing (FG24/3)</a></li>
          <li><a href="#kbs-investment-choices-preference-pathway">KBS Investment Choices (Preference Pathway)</a></li>
          <li><a href="#how-fund-managers-decide-sustainable-investments">How Fund Managers Decide “Sustainable” Investments</a></li>
          <li><a href="#suitability-cobs-9a">Suitability (COBS 9A)</a></li>
          <li><a href="#product-governance-prod-3">Product Governance (PROD 3)</a></li>
          <li><a href="#disclosures-design-for-understanding">Disclosures &amp; Design for Understanding</a></li>
          <li><a href="#glossary">Glossary</a></li>
        </ol>
      </li>
      <li><a href="#appendix-pdf-builder">Appendix: PDF Builder Sections (source text)</a></li>
      <li><a href="#kbs-records-templates">KBS Records &amp; Templates (mapping)</a></li>
      <li><a href="#disclaimers-guardrails">Disclaimers &amp; Compliance Guardrails</a></li>
      <li><a href="#sources">Sources (for internal reference)</a></li>
    </ol>
  </section>

  <section id="micro-modules-short-replies" class="education-pack__section">
    <h3>Micro-Modules (short replies)</h3>
    <ul>
      <li><strong>ESG basics</strong> &rarr; “ESG = Environmental, Social, Governance. It’s a risk-and-opportunity lens investors use to assess how companies are run and how they manage environmental &amp; social issues.”</li>
      <li><strong>SDR labels</strong> &rarr; “UK labels: <strong>Focus</strong>, <strong>Improvers</strong>, <strong>Impact</strong>, <strong>Mixed Goals</strong> — four ways funds can set sustainability objectives.”</li>
      <li><strong>Anti-greenwashing</strong> &rarr; “Claims must be <strong>fair, clear, not misleading</strong>. Visuals and comparisons must not over-imply sustainability; firms should hold evidence.”</li>
      <li><strong>Trade-offs</strong> &rarr; “Themes/screens can narrow the investable universe and affect diversification/returns — we’ll flag these so you can decide knowingly.”</li>
      <li><strong>Product governance</strong> &rarr; “Every fund has a defined <strong>target market</strong>. Recommendations must fit this; outside-target-market sales are captured and reviewed.”</li>
    </ul>
  </section>

  <section id="intents-and-responses" class="education-pack__section">
    <h3>Intents &amp; Responses (for Codex routing)</h3>
    <p class="education-pack__note">Each intent bundles training utterances, a short reply, a deep-dive anchor, and optional quick replies for conversational routing.</p>
    <div class="education-pack__intents">
      <details open>
        <summary><span class="education-pack__intent">help_overview</span></summary>
        <div>
          <p><strong>Utterances:</strong> help · menu · what can you do · show topics</p>
          <p><strong>Short reply:</strong> I can explain ESG, UK SDR labels, anti-greenwashing rules, your KBS Preference Pathway options, and how advisers turn preferences into suitable advice. What would you like to explore?</p>
          <p><strong>Deep link:</strong> <a href="#help-overview">#help-overview</a></p>
          <p><strong>Quick replies:</strong> What is ESG? · SDR labels · Preference Pathway · Anti-greenwashing · Suitability</p>
        </div>
      </details>
      <details>
        <summary><span class="education-pack__intent">esg_basics</span></summary>
        <div>
          <p><strong>Utterances:</strong> what is esg · esg basics · explain environmental social governance</p>
          <p><strong>Short reply:</strong> ESG is a lens to assess financially material environmental, social and governance factors in investments. It doesn’t automatically mean “sustainable” or “impact” — it’s a process investors use to price risk and find opportunities.</p>
          <p><strong>Deep link:</strong> <a href="#what-is-esg">#what-is-esg</a></p>
          <p><strong>Quick replies:</strong> SDR labels · Preference Pathway</p>
        </div>
      </details>
      <details>
        <summary><span class="education-pack__intent">sdr_labels</span></summary>
        <div>
          <p><strong>Utterances:</strong> what are sdr labels · uk sustainable labels · focus vs improvers vs impact vs mixed</p>
          <p><strong>Short reply:</strong> The UK’s optional labels are <strong>Focus</strong>, <strong>Improvers</strong>, <strong>Impact</strong>, and <strong>Mixed Goals</strong>. Each sets a different sustainability objective. Unlabelled funds making sustainability claims must still provide clear, simple info and state why there’s no label.</p>
          <p><strong>Deep link:</strong> <a href="#sdr-labels-uk-fca">#sdr-labels-uk-fca</a></p>
          <p><strong>Quick replies:</strong> Improvers vs Focus · What is Impact? · Mixed Goals</p>
        </div>
      </details>
      <details>
        <summary><span class="education-pack__intent">anti_greenwashing</span></summary>
        <div>
          <p><strong>Utterances:</strong> anti greenwashing · what counts as greenwashing · fair clear not misleading</p>
          <p><strong>Short reply:</strong> Claims must be correct and evidence-based, clear to the intended audience, complete (no cherry-picking), and fair/meaningful in comparisons. Visuals must not over-imply sustainability.</p>
          <p><strong>Deep link:</strong> <a href="#anti-greenwashing-fg243">#anti-greenwashing-fg243</a></p>
          <p><strong>Quick replies:</strong> Examples · Preference Pathway</p>
        </div>
      </details>
      <details>
        <summary><span class="education-pack__intent">kbs_pathway_overview</span></summary>
        <div>
          <p><strong>Utterances:</strong> preference pathway · investment choices · kbs options</p>
          <p><strong>Short reply:</strong> Choose from: Conventional, Conventional + ESG, Sustainability (Improvers / Focus / Impact / Mixed Goals), Ethical, and optional Philanthropy. You can mix pathways or apply different ones per product.</p>
          <p><strong>Deep link:</strong> <a href="#kbs-investment-choices-preference-pathway">#kbs-investment-choices-preference-pathway</a></p>
          <p><strong>Quick replies:</strong> Improvers · Focus · Impact · Mixed Goals · Ethical</p>
        </div>
      </details>
      <details>
        <summary><span class="education-pack__intent">improvers_detail</span></summary>
        <div>
          <p><strong>Utterances:</strong> what is improvers · explain sustainability improvers</p>
          <p><strong>Short reply:</strong> Invests mainly in assets that may not be sustainable now but aim to improve over time, typically using stewardship and engagement.</p>
          <p><strong>Deep link:</strong> <a href="#sustainability-improvers">#sustainability-improvers</a></p>
          <p><strong>Quick replies:</strong> How managers decide · Focus · Impact</p>
        </div>
      </details>
      <details>
        <summary><span class="education-pack__intent">focus_detail</span></summary>
        <div>
          <p><strong>Utterances:</strong> what is focus · sustainability focus label</p>
          <p><strong>Short reply:</strong> Invests mainly in assets that focus on sustainability (themes/standards). Narrower universes may affect diversification.</p>
          <p><strong>Deep link:</strong> <a href="#sustainability-focus">#sustainability-focus</a></p>
          <p><strong>Quick replies:</strong> Improvers · Impact · Mixed Goals</p>
        </div>
      </details>
      <details>
        <summary><span class="education-pack__intent">impact_detail</span></summary>
        <div>
          <p><strong>Utterances:</strong> what is impact · sustainability impact label</p>
          <p><strong>Short reply:</strong> Invests mainly in solutions to sustainability problems with an aim to achieve a positive, measurable impact using a theory of change and KPIs.</p>
          <p><strong>Deep link:</strong> <a href="#sustainability-impact">#sustainability-impact</a></p>
          <p><strong>Quick replies:</strong> How managers decide · Mixed Goals</p>
        </div>
      </details>
      <details>
        <summary><span class="education-pack__intent">mixed_goals_detail</span></summary>
        <div>
          <p><strong>Utterances:</strong> mixed goals label · how does mixed goals work</p>
          <p><strong>Short reply:</strong> A blended allocation across Focus, Improvers and Impact approaches. Can be manager-driven or tailored via your preferences.</p>
          <p><strong>Deep link:</strong> <a href="#sustainability-mixed-goals">#sustainability-mixed-goals</a></p>
          <p><strong>Quick replies:</strong> Improvers · Focus · Impact</p>
        </div>
      </details>
      <details>
        <summary><span class="education-pack__intent">ethical_investing</span></summary>
        <div>
          <p><strong>Utterances:</strong> ethical investing · values based investing</p>
          <p><strong>Short reply:</strong> Apply personal values via exclusions and/or positive screens (e.g., tobacco or human-rights screens). A restricted universe can affect risk/return.</p>
          <p><strong>Deep link:</strong> <a href="#ethical-investment">#ethical-investment</a></p>
          <p><strong>Quick replies:</strong> Preference Pathway · Suitability</p>
        </div>
      </details>
      <details>
        <summary><span class="education-pack__intent">how_managers_decide</span></summary>
        <div>
          <p><strong>Utterances:</strong> how do managers decide it's sustainable · fund manager role</p>
          <p><strong>Short reply:</strong> Managers set objectives and policies; use clear metrics and plain numbers; practice stewardship (especially for Improvers); keep evidence; and provide client-friendly annual progress updates.</p>
          <p><strong>Deep link:</strong> <a href="#how-fund-managers-decide-sustainable-investments">#how-fund-managers-decide-sustainable-investments</a></p>
          <p><strong>Quick replies:</strong> Anti-greenwashing · SDR labels</p>
        </div>
      </details>
      <details>
        <summary><span class="education-pack__intent">suitability</span></summary>
        <div>
          <p><strong>Utterances:</strong> suitability rules · what information do you need about me</p>
          <p><strong>Short reply:</strong> Advisers assess your knowledge/experience, financial situation (incl. ability to bear loss) and objectives/risk tolerance. If sufficient info isn’t obtained, no personal recommendation can be made. You’ll receive a written suitability report.</p>
          <p><strong>Deep link:</strong> <a href="#suitability-cobs-9a">#suitability-cobs-9a</a></p>
          <p><strong>Quick replies:</strong> Preference Pathway · Product governance</p>
        </div>
      </details>
      <details>
        <summary><span class="education-pack__intent">product_governance</span></summary>
        <div>
          <p><strong>Utterances:</strong> product governance · target market rules</p>
          <p><strong>Short reply:</strong> Manufacturers define target markets and share product info; distributors must understand products, set their own target market, ensure distribution in clients’ best interests, and review arrangements regularly.</p>
          <p><strong>Deep link:</strong> <a href="#product-governance-prod-3">#product-governance-prod-3</a></p>
          <p><strong>Quick replies:</strong> Suitability · Preference Pathway</p>
        </div>
      </details>
      <details>
        <summary><span class="education-pack__intent">tradeoffs</span></summary>
        <div>
          <p><strong>Utterances:</strong> are there trade offs · risks of sustainable funds</p>
          <p><strong>Short reply:</strong> Thematic screens can narrow the investable universe and affect diversification and risk/return. Outcomes depend on manager selection, portfolio construction, and your chosen preferences.</p>
          <p><strong>Deep link:</strong> <a href="#kbs-investment-choices-preference-pathway">#kbs-investment-choices-preference-pathway</a></p>
          <p><strong>Quick replies:</strong> How managers decide · Suitability</p>
        </div>
      </details>
    </div>
  </section>

  <section id="deep-dive-educational-content" class="education-pack__section">
    <h3>Deep-Dive Educational Content</h3>
    <article id="what-is-esg">
      <h4>What is ESG?</h4>
      <p>ESG is a structured way to evaluate financially material factors across three pillars:</p>
      <ul>
        <li><strong>Environmental</strong>: climate &amp; carbon, resource use, pollution, biodiversity.</li>
        <li><strong>Social</strong>: workforce, supply chains, safety &amp; well-being, human rights.</li>
        <li><strong>Governance</strong>: board oversight, audit, pay, ethics, controls, cyber.</li>
      </ul>
      <p class="education-pack__note">ESG integration alone doesn’t make a fund “sustainable” or “impact”; it’s an analysis lens for risk and opportunity.</p>
    </article>

    <article id="sdr-labels-uk-fca">
      <h4>SDR Labels (UK FCA)</h4>
      <p><strong>Labels (optional, criteria-based):</strong></p>
      <ul>
        <li><strong>Sustainability Focus</strong> — invest mainly in assets that focus on sustainability.</li>
        <li><strong>Sustainability Improvers</strong> — invest mainly in assets that aim to improve over time (often via stewardship).</li>
        <li><strong>Sustainability Impact</strong> — invest mainly in solutions with an aim to achieve a positive, measurable impact.</li>
        <li><strong>Sustainability Mixed Goals</strong> — invest mainly in a mix of Focus/Improvers/Impact assets.</li>
      </ul>
      <p><strong>Client cues:</strong> Labels visible from <time datetime="2024-07-31">31 Jul 2024</time>; from <time datetime="2025-04-02">2 Apr 2025</time>, unlabeled funds making sustainability claims must provide clear, simple explanations and a statement on why no label applies.</p>
    </article>

    <article id="anti-greenwashing-fg243">
      <h4>Anti-Greenwashing (FG24/3)</h4>
      <p>Product/service claims must be:</p>
      <ul>
        <li><strong>Correct &amp; substantiated</strong> (evidence held and reviewed).</li>
        <li><strong>Clear &amp; understandable</strong> (avoid vague terms; explain technical terms).</li>
        <li><strong>Complete</strong> (no cherry-picking; state conditions/limitations; consider lifecycle).</li>
        <li><strong>Fair &amp; meaningful</strong> in comparisons (compare like-with-like; disclose scope/limits).</li>
      </ul>
      <p><strong>Visuals matter:</strong> images, logos and colours must not over-imply sustainability.</p>
    </article>

    <article id="kbs-investment-choices-preference-pathway">
      <h4>KBS Investment Choices (Preference Pathway)</h4>
      <p>KBS framework for aligning client choices and records (may combine strategies and/or set different pathways per product):</p>
      <ul>
        <li><strong>Conventional</strong> — financial risk/return objective; no explicit sustainability objective.</li>
        <li><strong>Conventional including ESG</strong> — financial risk/return objective plus ESG integration in research/risk management.</li>
        <li><strong>Sustainability: Improvers</strong> — aim to improve sustainability over time; stewardship/engagement central.</li>
        <li><strong>Sustainability: Focus</strong> — align to environmental/social themes or standards; narrower universes can affect diversification.</li>
        <li><strong>Sustainability: Impact</strong> — solutions-oriented; measurable outcomes with theory of change and KPIs; annual progress updates.</li>
        <li><strong>Sustainability: Mixed Goals</strong> — blended allocation across Focus/Improvers/Impact.</li>
        <li><strong>Ethical Investment</strong> — values-based screens; universe restrictions vary by criteria.</li>
        <li><strong>Philanthropy</strong> — optional complement (giving linked to priority causes/SDGs).</li>
      </ul>
    </article>

    <article id="sustainability-improvers">
      <h4>Sustainability Improvers</h4>
      <p>Invests mainly in assets that may not be sustainable now but aim to improve over time. Stewardship and engagement plans are critical; progress evidence is shared in annual reporting.</p>
    </article>

    <article id="sustainability-focus">
      <h4>Sustainability Focus</h4>
      <p>Invests mainly in assets already aligned with sustainability themes or standards. Portfolio construction may be more concentrated; diversification impacts should be assessed alongside client objectives.</p>
    </article>

    <article id="sustainability-impact">
      <h4>Sustainability Impact</h4>
      <p>Targets solutions to sustainability challenges with a clear theory of change and measurable KPIs. Requires credible impact measurement, governance and transparent reporting.</p>
    </article>

    <article id="sustainability-mixed-goals">
      <h4>Sustainability Mixed Goals</h4>
      <p>Blends Focus, Improvers and Impact approaches. Can be manager-driven or client-directed through preference capture, providing flexibility to match different outcomes.</p>
    </article>

    <article id="ethical-investment">
      <h4>Ethical Investment</h4>
      <p>Applies exclusions or positive screens aligned to personal values (e.g., tobacco, human rights). Narrower universes can affect risk/return; suitability and diversification must be reassessed.</p>
    </article>

    <article id="how-fund-managers-decide-sustainable-investments">
      <h4>How Fund Managers Decide “Sustainable” Investments</h4>
      <ul>
        <li><strong>Objectives &amp; policy:</strong> align goals with labels; explain exclusions and stewardship.</li>
        <li><strong>Metrics &amp; plain numbers:</strong> use clear metrics (e.g., “£67 of every £100”) and contextual cues.</li>
        <li><strong>Stewardship:</strong> engagement priorities, escalation and voting — critical for Improvers strategies.</li>
        <li><strong>Evidence &amp; balance:</strong> maintain audit trails; disclose limitations and negatives.</li>
        <li><strong>Annual updates:</strong> provide client-friendly progress against KPIs.</li>
      </ul>
    </article>

    <article id="suitability-cobs-9a">
      <h4>Suitability (COBS 9A)</h4>
      <p>Advisers gather <strong>knowledge/experience</strong>, <strong>financial situation/ability to bear loss</strong>, and <strong>objectives/risk tolerance</strong>.</p>
      <ul>
        <li>No personal recommendation if sufficient information is not obtained.</li>
        <li>Suitability reports explain how advice fits preferences/objectives.</li>
        <li>Periodic review statements provided where relevant.</li>
      </ul>
    </article>

    <article id="product-governance-prod-3">
      <h4>Product Governance (PROD 3)</h4>
      <ul>
        <li><strong>Manufacturers:</strong> define target market, align distribution strategy, share product information, review products regularly, manage conflicts, ensure competence and oversight.</li>
        <li><strong>Distributors:</strong> understand products, set their own target market, ensure distribution in clients’ best interests, monitor sales (including outside target market), review arrangements, maintain management oversight and competence.</li>
      </ul>
    </article>

    <article id="disclosures-design-for-understanding">
      <h4>Disclosures &amp; Design for Understanding</h4>
      <p>Behaviourally-informed factsheets improve comprehension versus KIIDs alone. Best practices include:</p>
      <ul>
        <li>Provide single-label description for the product in hand.</li>
        <li>Use plain numbers (pounds/frequencies), pre-calculate and avoid excess jargon.</li>
        <li>Add context and evaluative cues for key metrics; indicate better/worse visually.</li>
        <li>Time disclosure at decision points; encourage engagement.</li>
      </ul>
    </article>

    <article id="glossary">
      <h4>Glossary</h4>
      <dl class="education-pack__definition-list">
        <div>
          <dt>ESG integration</dt>
          <dd>Considering environmental, social and governance factors in investment analysis and risk management.</dd>
        </div>
        <div>
          <dt>Stewardship</dt>
          <dd>Engagement and voting to influence investee companies.</dd>
        </div>
        <div>
          <dt>Theory of change</dt>
          <dd>A roadmap describing how a strategy expects to create measurable outcomes.</dd>
        </div>
        <div>
          <dt>Implied temperature rise</dt>
          <dd>A portfolio-level warming pathway metric.</dd>
        </div>
        <div>
          <dt>Relative carbon footprint</dt>
          <dd>Carbon per unit invested versus a benchmark.</dd>
        </div>
      </dl>
    </article>
  </section>

  <section id="appendix-pdf-builder" class="education-pack__section">
    <h3>Appendix: PDF Builder Sections (source text)</h3>
    <p class="education-pack__note">Use this as the source to compile or refresh the client/compliance PDF.</p>
    <ol>
      <li><strong>Front matter:</strong> ESG &amp; SDR Educational Pack — Detailed Guide (v2.0, KBS Preference Pathway Edition); last updated 2025-10-29.</li>
      <li><strong>What ESG is — and is not:</strong> ESG factors; ESG ≠ automatically sustainable/impact.</li>
      <li><strong>UK SDR labels (client-friendly overview):</strong> Focus, Improvers, Impact, Mixed Goals; timeline cues; unlabeled claimants must provide simple info + “why no label” statement.</li>
      <li><strong>Anti-Greenwashing (FG24/3):</strong> Correct; Clear; Complete; Fair/meaningful comparisons; visuals must be consistent.</li>
      <li><strong>Investment choices (KBS Preference Pathway):</strong> Conventional; Conventional+ESG; Improvers; Focus; Impact; Mixed Goals; Ethical; Philanthropy — with notes on trade-offs and stewardship.</li>
      <li><strong>How fund managers decide:</strong> objectives/policy; plain numbers &amp; metrics; stewardship; evidence &amp; balance; annual updates.</li>
      <li><strong>Suitability (COBS 9A):</strong> info to obtain; no recommendation if insufficient; suitability reports; periodic review statements.</li>
      <li><strong>Product governance (PROD 3):</strong> manufacturer vs distributor duties; target market; oversight; competence; review.</li>
      <li><strong>Designing disclosures:</strong> one-page summaries; plain numbers; context; evaluative cues; avoid overwhelming comparisons.</li>
      <li><strong>Key client notices:</strong> risk warnings; screens and diversification; evolving data/methods; educational-only disclaimer.</li>
    </ol>
  </section>

  <section id="kbs-records-templates" class="education-pack__section">
    <h3>KBS Records &amp; Templates (mapping)</h3>
    <ul>
      <li><strong>Informed Choice: Preference Pathway (client guide)</strong> &rarr; maps to <a href="#kbs-investment-choices-preference-pathway">KBS Investment Choices</a>.</li>
      <li><strong>Preference Pathway Record (client &amp; adviser)</strong> &rarr; capture chosen pathway(s), % allocations, notes, and signatures.</li>
      <li><strong>Anti-Greenwashing Checklist (compliance)</strong> &rarr; verify claims are <strong>correct, clear, complete, fair</strong>; check visuals and comparisons.</li>
    </ul>
  </section>

  <section id="disclaimers-guardrails" class="education-pack__section">
    <h3>Disclaimers &amp; Compliance Guardrails</h3>
    <ul>
      <li><strong>Educational only; not advice.</strong> Ask your adviser for personalised recommendations.</li>
      <li><strong>Anti-greenwashing:</strong> ensure product/service claims are correct, clear, complete, and fair; visuals must not over-imply sustainability.</li>
      <li><strong>Trade-offs:</strong> thematic or exclusionary strategies can impact diversification and risk/return.</li>
      <li><strong>Suitability &amp; target market:</strong> apply COBS 9A and PROD 3 duties when turning preferences into advice.</li>
      <li><strong>Updates:</strong> sustainability data and methodologies evolve; labels/disclosures may change over time.</li>
    </ul>
  </section>

  <section id="sources" class="education-pack__section">
    <h3>Sources (for internal reference)</h3>
    <ul>
      <li>UK FCA: Sustainable investment labels &amp; anti-greenwashing (labels, timelines, consumer disclosures).</li>
      <li>UK FCA: FG24/3 Anti-Greenwashing Guidance (correct/clear/complete/fair + visuals).</li>
      <li>UK FCA: Occasional Paper 62 (factsheet design; plain numbers; single-label display; improved comprehension).</li>
      <li>FCA Handbook: COBS 9A (suitability duties; suitability reports; periodic statements).</li>
      <li>FCA Handbook: PROD 3 (product governance; target market; distribution oversight).</li>
      <li>KBS Preference Pathway documents (client education &amp; record templates).</li>
    </ul>
  </section>
`;

export function renderEducationPack(container) {
  if (!container) return;
  container.innerHTML = educationPackHtml;
}
