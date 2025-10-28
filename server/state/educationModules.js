// Enhanced Educational Modules with comprehensive ESG content
// Supports PDF resources, progress tracking, and comprehension verification

export const EDUCATION_MODULES = [
  {
    title: "ESG basics",
    keywords: [/\bwhat is esg\b/i, /\besg basics\b/i, /tell me more about esg/i, /environmental social governance/i],
    summary:
      "ESG stands for Environmental, Social, and Governance factors – it's a framework for understanding how companies behave, not a guarantee of positive outcomes.",
    detailed_explanation: "ESG investing considers Environmental factors (climate change, resource depletion, waste management), Social factors (human rights, labor standards, community relations), and Governance factors (board composition, executive compensation, transparency). These factors help assess long-term sustainability risks and opportunities but don't guarantee investment performance.",
    pdf_available: true,
    comprehension_check: "Do you understand that ESG factors are used for assessment but don't guarantee positive investment outcomes?",
    category: "fundamentals"
  },
  {
    title: "Impact investing",
    keywords: [/impact investing/i, /measurable outcomes/i, /social impact/i, /environmental impact/i],
    summary:
      "Impact investing aims for measurable environmental or social outcomes alongside returns. Under the FCA's Impact label we must evidence those outcomes through stewardship and transparent reporting.",
    detailed_explanation: "Impact investments must demonstrate intentionality to generate positive, measurable social and environmental impact alongside financial return. The FCA's Impact label requires funds to show how they measure and report on real-world outcomes, not just ESG scores. Examples include renewable energy projects, affordable housing, or healthcare access initiatives.",
    pdf_available: true,
    comprehension_check: "Do you understand that Impact investments must show measurable real-world outcomes, not just good ESG scores?",
    category: "investment_approaches"
  },
  {
    title: "FCA SDR labels",
    keywords: [/sdr labels?/i, /tell me more about labels/i, /sustainability labels/i, /focus improvers impact mixed/i],
    summary:
      "The FCA SDR labels include Focus, Improvers, Impact, and Mixed Goals. Each label signals how a product pursues sustainability outcomes and what evidence it must provide.",
    detailed_explanation: "Focus funds invest at least 70% in assets already demonstrating strong sustainability characteristics. Improvers funds invest in assets with clear plans to improve sustainability performance through engagement. Impact funds target measurable positive outcomes. Mixed Goals funds pursue sustainability alongside other objectives without a dominant sustainability focus.",
    pdf_available: true,
    comprehension_check: "Can you explain the difference between Focus funds (already sustainable companies) and Improvers funds (companies working to improve)?",
    category: "regulation"
  },
  {
    title: "Anti-Greenwashing",
    keywords: [/anti[- ]?greenwashing/i, /greenwashing/i, /sustainability claims/i, /evidence backed/i],
    summary:
      "The Anti-Greenwashing Rule means any sustainability claim we make must be fair, clear, and backed by evidence. We attach disclosures so you can verify what's promised.",
    detailed_explanation: "The FCA's Anti-Greenwashing Rule requires that sustainability-related claims are substantiated by evidence, clearly explained, and not misleading. This means we must provide supporting documentation, avoid vague terms like 'green' or 'sustainable' without context, and ensure claims are proportionate to the actual sustainability characteristics of the investment.",
    pdf_available: true,
    comprehension_check: "Do you understand that all sustainability claims must be backed by clear evidence and documentation?",
    category: "regulation"
  },
  {
    title: "Risks & trade-offs",
    keywords: [/sustainability risks/i, /trade[- ]?offs/i, /risks of esg/i, /performance impact/i, /concentration risk/i],
    summary:
      "Sustainable investing can involve tracking error, sector concentration, or short-term underperformance. We weigh those trade-offs so you know where outcomes might differ from the broad market.",
    detailed_explanation: "Sustainable investing may involve trade-offs including: sector concentration (avoiding certain industries), tracking error versus broad market indices, potential short-term underperformance during market transitions, higher fees for active management, and liquidity constraints in some sustainable asset classes. These risks must be weighed against potential benefits like reduced long-term sustainability risks.",
    pdf_available: true,
    comprehension_check: "Do you understand that sustainable investing may involve trade-offs in terms of diversification and potential performance differences?",
    category: "risks"
  },
  {
    title: "Product governance",
    keywords: [/product governance/i, /prod 3/i, /target market/i, /suitability/i],
    summary:
      "Product governance (PROD 3) requires us to match you with solutions designed for your target market and to document how the manufacturer supports those outcomes.",
    detailed_explanation: "PROD 3 rules require fund manufacturers to define target markets for their products and ensure distribution is appropriate. This includes identifying suitable client types, investment objectives, risk tolerance levels, and knowledge requirements. We must ensure any recommendation aligns with both the product's target market and your individual circumstances.",
    pdf_available: true,
    comprehension_check: "Do you understand that we must match you with products specifically designed for clients with your profile and objectives?",
    category: "regulation"
  },
  {
    title: "Switching considerations",
    keywords: [/switching/i, /move my investments/i, /transfer/i, /exit charges/i, /switching costs/i],
    summary:
      "When switching investments we compare costs, exit penalties, and whether the new product genuinely improves sustainability outcomes before recommending a change.",
    detailed_explanation: "Switching analysis considers: exit charges from current investments, potential capital gains tax implications, loss of loyalty bonuses or guarantees, transaction costs, and whether the new investment genuinely offers better sustainability outcomes or suitability. We must demonstrate that benefits outweigh costs and switching is in your best interests.",
    pdf_available: true,
    comprehension_check: "Do you understand that switching investments involves costs and we must show the benefits justify these costs?",
    category: "practical"
  },
  {
    title: "Focus vs Improvers",
    keywords: [/focus vs improvers/i, /difference between focus and improvers/i, /focus funds/i, /improvers funds/i],
    summary:
      "Focus funds back companies already leading on sustainability, while Improvers support firms with credible plans to get better through engagement.",
    detailed_explanation: "Focus funds invest primarily in companies that already demonstrate strong sustainability performance across relevant ESG factors. Improvers funds target companies that may not currently lead on sustainability but have credible, time-bound plans to improve, supported by active engagement from the fund manager. Both approaches can be valid depending on your preferences for current versus future sustainability performance.",
    pdf_available: true,
    comprehension_check: "Can you explain whether you'd prefer investing in companies that are already sustainable (Focus) or those working to improve (Improvers)?",
    category: "investment_approaches"
  },
  {
    title: "Exclusions examples",
    keywords: [/examples of exclusions/i, /what exclusions/i, /negative screening/i, /excluded sectors/i],
    summary:
      "Common exclusions include fossil fuels above a set revenue threshold, tobacco, controversial weapons, and severe human-rights breaches.",
    detailed_explanation: "Exclusion strategies typically target: fossil fuel companies (often with revenue thresholds like >5% or >10%), tobacco production and distribution, controversial weapons manufacturing, companies with severe human rights violations, gambling operations, adult entertainment, and sometimes alcohol production. Thresholds help distinguish between primary business activities and incidental revenue sources.",
    pdf_available: true,
    comprehension_check: "Do you understand the difference between excluding companies entirely versus setting revenue thresholds for certain activities?",
    category: "investment_approaches"
  },
  {
    title: "Stewardship",
    keywords: [/what does stewardship mean/i, /tell me about stewardship/i, /engagement mean/i, /shareholder engagement/i, /voting rights/i],
    summary:
      "Stewardship means fund managers using voting rights and engagement to push companies toward better sustainability practices.",
    detailed_explanation: "Stewardship involves fund managers actively engaging with companies through: voting at shareholder meetings on ESG-related resolutions, direct dialogue with company management on sustainability issues, collaborative engagement with other investors, filing or supporting shareholder proposals, and in extreme cases, divestment. Effective stewardship requires resources, expertise, and long-term commitment from the fund manager.",
    pdf_available: true,
    comprehension_check: "Do you understand that stewardship means fund managers actively work to influence companies rather than just avoiding problematic investments?",
    category: "investment_approaches"
  },
  {
    title: "Climate change investing",
    keywords: [/climate change/i, /climate investing/i, /net zero/i, /carbon footprint/i, /climate transition/i],
    summary:
      "Climate investing focuses on the transition to a low-carbon economy, considering both climate risks and opportunities across different sectors and geographies.",
    detailed_explanation: "Climate investing addresses physical risks (extreme weather, sea level rise) and transition risks (policy changes, technology shifts, changing consumer preferences). Investment approaches include: clean technology and renewable energy, companies with credible net-zero commitments, climate adaptation solutions, and avoiding high-carbon intensive industries. Climate metrics include carbon footprint, green revenue exposure, and alignment with temperature scenarios.",
    pdf_available: true,
    comprehension_check: "Do you understand the difference between investing in climate solutions versus avoiding climate risks?",
    category: "themes"
  },
  {
    title: "Social impact themes",
    keywords: [/social impact/i, /social themes/i, /human rights/i, /social equity/i, /diversity inclusion/i],
    summary:
      "Social impact investing targets positive outcomes in areas like healthcare access, education, affordable housing, and workplace equality.",
    detailed_explanation: "Social impact themes include: healthcare access and affordability, quality education and skills development, affordable housing and financial inclusion, workplace diversity and fair labor practices, community development and social infrastructure. Measurement focuses on beneficiary numbers, outcome improvements, and alignment with UN Sustainable Development Goals (SDGs).",
    pdf_available: true,
    comprehension_check: "Can you identify which social impact themes are most important to your values and investment goals?",
    category: "themes"
  },
  {
    title: "Biodiversity and nature",
    keywords: [/biodiversity/i, /nature/i, /natural capital/i, /ecosystem/i, /deforestation/i],
    summary:
      "Nature-focused investing addresses biodiversity loss, ecosystem degradation, and the sustainable use of natural resources.",
    detailed_explanation: "Nature and biodiversity investing considers: deforestation and land use change, water scarcity and pollution, ocean health and marine ecosystems, sustainable agriculture and food systems, circular economy and waste reduction. Companies are assessed on their impact on natural capital, dependencies on ecosystem services, and contributions to nature-positive outcomes.",
    pdf_available: true,
    comprehension_check: "Do you understand how companies can both depend on and impact natural ecosystems?",
    category: "themes"
  },
  {
    title: "Governance factors",
    keywords: [/governance/i, /board composition/i, /executive pay/i, /transparency/i, /corporate governance/i],
    summary:
      "Governance factors assess how companies are managed, including board effectiveness, executive compensation, transparency, and stakeholder rights.",
    detailed_explanation: "Key governance factors include: board independence and diversity, executive compensation alignment with performance, transparency in reporting and disclosure, shareholder rights and minority protection, business ethics and anti-corruption measures, cybersecurity and data protection, and stakeholder engagement practices. Strong governance can reduce investment risks and improve long-term performance.",
    pdf_available: true,
    comprehension_check: "Do you understand why good corporate governance can be important for investment performance and risk management?",
    category: "fundamentals"
  },
  {
    title: "Sustainable Development Goals",
    keywords: [/sdg/i, /sustainable development goals/i, /un goals/i, /global goals/i],
    summary:
      "The UN's 17 Sustainable Development Goals provide a framework for measuring positive impact across social and environmental themes.",
    detailed_explanation: "The SDGs include goals like: No Poverty, Zero Hunger, Good Health, Quality Education, Gender Equality, Clean Water, Affordable Clean Energy, Decent Work, Industry Innovation, Reduced Inequalities, Sustainable Cities, Responsible Consumption, Climate Action, Life Below Water, Life on Land, Peace and Justice, and Partnerships. Impact investments often align with specific SDGs and measure contribution to goal achievement.",
    pdf_available: true,
    comprehension_check: "Can you identify which SDGs align most closely with your impact investment interests?",
    category: "themes"
  }
];

// Educational progress tracking
export const trackEducationalProgress = (session, moduleTitle, interactionType = 'viewed') => {
  if (!session.data.educational_progress) {
    session.data.educational_progress = {
      modules_accessed: [],
      comprehension_responses: {},
      pdf_downloads: [],
      total_time_spent: 0,
      last_accessed: null
    };
  }

  const progress = session.data.educational_progress;
  const timestamp = new Date().toISOString();

  // Track module access
  const existingAccess = progress.modules_accessed.find(item => item.module === moduleTitle);
  if (existingAccess) {
    existingAccess.access_count += 1;
    existingAccess.last_accessed = timestamp;
    existingAccess.interaction_types = existingAccess.interaction_types || [];
    if (!existingAccess.interaction_types.includes(interactionType)) {
      existingAccess.interaction_types.push(interactionType);
    }
  } else {
    progress.modules_accessed.push({
      module: moduleTitle,
      first_accessed: timestamp,
      last_accessed: timestamp,
      access_count: 1,
      interaction_types: [interactionType]
    });
  }

  progress.last_accessed = timestamp;
  return progress;
};

// Comprehension verification
export const recordComprehensionResponse = (session, moduleTitle, response, correct = null) => {
  if (!session.data.educational_progress) {
    trackEducationalProgress(session, moduleTitle, 'comprehension_check');
  }

  const progress = session.data.educational_progress;
  if (!progress.comprehension_responses[moduleTitle]) {
    progress.comprehension_responses[moduleTitle] = [];
  }

  progress.comprehension_responses[moduleTitle].push({
    response: response,
    timestamp: new Date().toISOString(),
    correct: correct,
    attempts: progress.comprehension_responses[moduleTitle].length + 1
  });

  return progress;
};

// PDF resource management
export const trackPdfDownload = (session, moduleTitle, pdfType = 'detailed_explanation') => {
  trackEducationalProgress(session, moduleTitle, 'pdf_download');
  
  const progress = session.data.educational_progress;
  progress.pdf_downloads.push({
    module: moduleTitle,
    pdf_type: pdfType,
    downloaded_at: new Date().toISOString()
  });

  return progress;
};

// Get educational recommendations based on client profile and preferences
export const getEducationalRecommendations = (session) => {
  const profile = session.data?.client_profile || {};
  const prefs = session.data?.sustainability_preferences || {};
  const progress = session.data?.educational_progress || {};

  const recommendations = [];
  const accessedModules = progress.modules_accessed?.map(item => item.module) || [];

  // Recommend based on preference level
  if (prefs.preference_level === 'detailed') {
    const detailedModules = ['Climate change investing', 'Social impact themes', 'Biodiversity and nature', 'Sustainable Development Goals'];
    detailedModules.forEach(module => {
      if (!accessedModules.includes(module)) {
        recommendations.push({
          module: module,
          reason: 'Recommended for detailed sustainability preferences',
          priority: 'high'
        });
      }
    });
  }

  // Recommend based on label interests
  if (prefs.labels_interest?.includes('Impact')) {
    if (!accessedModules.includes('Impact investing')) {
      recommendations.push({
        module: 'Impact investing',
        reason: 'You expressed interest in Impact investments',
        priority: 'high'
      });
    }
    if (!accessedModules.includes('Sustainable Development Goals')) {
      recommendations.push({
        module: 'Sustainable Development Goals',
        reason: 'SDGs are key to measuring impact outcomes',
        priority: 'medium'
      });
    }
  }

  // Recommend based on themes
  if (prefs.themes?.includes('climate')) {
    if (!accessedModules.includes('Climate change investing')) {
      recommendations.push({
        module: 'Climate change investing',
        reason: 'You expressed interest in climate themes',
        priority: 'high'
      });
    }
  }

  // Recommend based on risk tolerance
  if (profile.risk_tolerance >= 5) {
    if (!accessedModules.includes('Risks & trade-offs')) {
      recommendations.push({
        module: 'Risks & trade-offs',
        reason: 'Important for higher risk tolerance profiles',
        priority: 'medium'
      });
    }
  }

  return recommendations.slice(0, 3); // Limit to top 3 recommendations
};

// Generate educational summary for advisor
export const generateEducationalSummary = (session) => {
  const progress = session.data?.educational_progress;
  if (!progress) {
    return "No educational content accessed yet.";
  }

  const summary = {
    total_modules_accessed: progress.modules_accessed?.length || 0,
    most_accessed_modules: progress.modules_accessed
      ?.sort((a, b) => b.access_count - a.access_count)
      ?.slice(0, 3)
      ?.map(item => `${item.module} (${item.access_count} times)`) || [],
    comprehension_checks_completed: Object.keys(progress.comprehension_responses || {}).length,
    pdf_downloads: progress.pdf_downloads?.length || 0,
    last_educational_activity: progress.last_accessed
  };

  return summary;
};