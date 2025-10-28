// Enhanced Compliance System
// Provides detailed regulatory explanations and comprehensive audit logging

export const ENHANCED_COMPLIANCE_REASONS = {
  SEGMENT_B_ONBOARDING: {
    0: {
      reason: "I record whether you're investing as an individual, joint client, trust, or company so Consumer Duty and PROD checks line up with the right permissions.",
      regulatory_basis: "COBS 9A.2.1 requires firms to obtain information about the client's legal status to ensure appropriate permissions and capacity to invest.",
      consumer_duty_aspect: "Consumer Duty requires us to understand who we're dealing with to provide appropriate support and communications.",
      documentation_requirement: "Client type must be recorded for all suitability assessments and ongoing monitoring.",
      potential_consequences: "Incorrect client classification could lead to inappropriate product recommendations or regulatory breaches."
    },
    1: {
      reason: "Understanding your main goal helps me evidence suitability against COBS 9A – advice must reflect what you're trying to achieve.",
      regulatory_basis: "COBS 9A.2.1(1) requires knowledge of investment objectives as a mandatory suitability criterion.",
      consumer_duty_aspect: "Consumer Duty outcome on products and services requires alignment between client needs and recommendations.",
      documentation_requirement: "Investment objectives must be clearly documented and regularly reviewed for ongoing suitability.",
      potential_consequences: "Misaligned objectives could result in unsuitable recommendations and poor client outcomes."
    },
    2: {
      reason: "Knowing your investment horizon lets me check that any strategy remains suitable over time, which the rules require.",
      regulatory_basis: "COBS 9A.2.1 requires understanding of the client's investment time horizon for suitability assessment.",
      consumer_duty_aspect: "Consumer Duty requires consideration of the client's circumstances over the expected investment period.",
      documentation_requirement: "Time horizon must be documented and considered in product selection and ongoing reviews.",
      potential_consequences: "Inappropriate time horizons could lead to liquidity mismatches or unsuitable product features."
    },
    3: {
      reason: "Capturing your risk tolerance ensures recommendations match the level of volatility you can handle under COBS 9A.",
      regulatory_basis: "COBS 9A.2.1(2) requires assessment of client's ability to bear losses and risk tolerance for suitability.",
      consumer_duty_aspect: "Consumer Duty requires understanding client's attitude to risk to avoid foreseeable harm.",
      documentation_requirement: "Risk tolerance must be assessed, documented, and regularly reviewed.",
      potential_consequences: "Risk misalignment could result in client distress, complaints, or regulatory action."
    },
    4: {
      reason: "Capacity for loss is a mandatory field so we understand how much downside you can absorb before your lifestyle is affected.",
      regulatory_basis: "COBS 9A.2.1(2) specifically requires assessment of the client's ability to bear losses financially.",
      consumer_duty_aspect: "Consumer Duty requires understanding of client's financial resilience to prevent foreseeable harm.",
      documentation_requirement: "Capacity for loss must be separately assessed from risk tolerance and clearly documented.",
      potential_consequences: "Inadequate capacity assessment could lead to financial hardship and regulatory breaches."
    },
    5: {
      reason: "Liquidity needs stop us from locking money away when you might need access – that's part of the PROD governance checks.",
      regulatory_basis: "COBS 9A.2.1 requires understanding of client's liquidity needs for suitability assessment.",
      consumer_duty_aspect: "Consumer Duty requires consideration of client's need for access to funds.",
      documentation_requirement: "Liquidity requirements must be documented and matched to product features.",
      potential_consequences: "Liquidity mismatches could prevent access to funds when needed, causing client detriment."
    },
    6: {
      reason: "Your knowledge and experience guide me toward products that are appropriate for you.",
      regulatory_basis: "COBS 9A.2.1(3) requires assessment of client's knowledge and experience in relevant investment types.",
      consumer_duty_aspect: "Consumer Duty requires products to be targeted at clients with appropriate understanding.",
      documentation_requirement: "Knowledge and experience must be assessed and documented for each relevant investment area.",
      potential_consequences: "Inappropriate complexity could lead to client confusion and poor investment decisions."
    },
    7: {
      reason: "Financial context helps an adviser check affordability and Consumer Duty outcomes, even if you opt to keep it high level.",
      regulatory_basis: "COBS 9A.2.1(4) requires information about financial situation including income, assets, and liabilities.",
      consumer_duty_aspect: "Consumer Duty requires consideration of affordability and proportionality of recommendations.",
      documentation_requirement: "Financial situation must be assessed to the extent necessary for suitability assessment.",
      potential_consequences: "Inadequate financial assessment could lead to unaffordable recommendations."
    },
    8: {
      reason: "Those financial notes give the adviser evidence for affordability and ongoing suitability reviews.",
      regulatory_basis: "COBS 9A.3.1 requires firms to maintain records of suitability assessments including financial information.",
      consumer_duty_aspect: "Consumer Duty requires ongoing monitoring of client circumstances and outcomes.",
      documentation_requirement: "Financial information must be recorded and updated for ongoing suitability monitoring.",
      potential_consequences: "Inadequate records could prevent effective ongoing suitability monitoring."
    },
    risk_override: {
      reason: "Because you selected a higher risk level than your loss capacity, I must double-check you're comfortable proceeding to satisfy COBS 9A.",
      regulatory_basis: "COBS 9A.2.1 requires careful assessment when risk tolerance exceeds capacity for loss.",
      consumer_duty_aspect: "Consumer Duty requires firms to act to prevent foreseeable harm from risk misalignment.",
      documentation_requirement: "Risk override decisions must be clearly documented with client confirmation.",
      potential_consequences: "Proceeding without proper confirmation could result in unsuitable high-risk recommendations."
    }
  },
  SEGMENT_C_CONSENT: {
    0: {
      reason: "Data processing consent is required before we can store or use the information you share.",
      regulatory_basis: "UK GDPR Article 6 requires lawful basis for processing personal data, typically consent for advisory services.",
      consumer_duty_aspect: "Consumer Duty requires clear communication about how client data will be used.",
      documentation_requirement: "Consent must be freely given, specific, informed, and unambiguous with clear records.",
      potential_consequences: "Processing without valid consent could result in data protection breaches and regulatory action."
    },
    1: {
      reason: "E-delivery consent confirms you're happy to receive disclosures digitally, which we must evidence.",
      regulatory_basis: "COBS 2.1.1 allows electronic delivery of information with appropriate client consent.",
      consumer_duty_aspect: "Consumer Duty requires ensuring clients can access and understand information in the chosen format.",
      documentation_requirement: "E-delivery consent must be clearly recorded with confirmation of technical capability.",
      potential_consequences: "Invalid e-delivery could result in clients not receiving required disclosures."
    },
    2: {
      reason: "Future contact permissions make sure we respect marketing rules and your preferences.",
      regulatory_basis: "PECR and UK GDPR require consent for direct marketing communications.",
      consumer_duty_aspect: "Consumer Duty requires respecting client preferences for communication frequency and method.",
      documentation_requirement: "Marketing consent must be separate, specific, and easily withdrawable.",
      potential_consequences: "Unauthorized marketing could result in regulatory action and client complaints."
    },
    3: {
      reason: "Recording the purpose of future contact shows we'll only reach out for the reasons you agree to.",
      regulatory_basis: "UK GDPR requires processing to be limited to specified, explicit, and legitimate purposes.",
      consumer_duty_aspect: "Consumer Duty requires clear communication about the purpose and frequency of contact.",
      documentation_requirement: "Purpose limitation must be clearly documented and adhered to in practice.",
      potential_consequences: "Contact beyond agreed purposes could breach data protection and consumer duty requirements."
    }
  },
  SEGMENT_D_EDUCATION: {
    acknowledgement: {
      reason: "The FCA's Anti-Greenwashing and SDR rules expect us to show you how sustainability claims are evidenced before we continue.",
      regulatory_basis: "FCA Anti-Greenwashing Rule requires sustainability claims to be fair, clear, and not misleading with supporting evidence.",
      consumer_duty_aspect: "Consumer Duty requires clear communication and understanding before proceeding with sustainability-related advice.",
      documentation_requirement: "Education delivery and client acknowledgment must be documented for compliance evidence.",
      potential_consequences: "Proceeding without proper education could result in uninformed decisions and regulatory breaches."
    },
    summary: {
      reason: "Making sure you understand the difference between SDR labels helps keep any recommendation fair, clear, and not misleading.",
      regulatory_basis: "FCA SDR rules require clear explanation of sustainability labels and their meanings.",
      consumer_duty_aspect: "Consumer Duty requires ensuring client understanding before making sustainability-related recommendations.",
      documentation_requirement: "Label explanations and client understanding must be documented.",
      potential_consequences: "Misunderstanding of labels could lead to unsuitable sustainability recommendations."
    }
  },
  SEGMENT_E_OPTIONS: {
    preferenceLevel: {
      reason: "Capturing your preference level lets me map you to the right SDR sustainability pathway.",
      regulatory_basis: "FCA SDR rules require appropriate categorization of client sustainability preferences.",
      consumer_duty_aspect: "Consumer Duty requires understanding client needs to provide appropriate sustainability options.",
      documentation_requirement: "Preference level must be clearly documented and justified.",
      potential_consequences: "Incorrect preference mapping could lead to unsuitable sustainability recommendations."
    },
    1: {
      reason: "Label interests show which SDR categories align with your goals so we only shortlist suitable options.",
      regulatory_basis: "FCA SDR rules require alignment between client preferences and product sustainability characteristics.",
      consumer_duty_aspect: "Consumer Duty requires products to meet client needs and deliver good outcomes.",
      documentation_requirement: "Label preferences must be documented and matched to product characteristics.",
      potential_consequences: "Misaligned labels could result in products that don't meet client sustainability expectations."
    },
    2: {
      reason: "Themes help us prioritise the ESG outcomes you care about when reviewing products.",
      regulatory_basis: "FCA guidance requires consideration of client-specific sustainability preferences in product selection.",
      consumer_duty_aspect: "Consumer Duty requires understanding what matters to clients for appropriate recommendations.",
      documentation_requirement: "Theme preferences must be documented and considered in product evaluation.",
      potential_consequences: "Ignoring client themes could result in recommendations that don't align with values."
    },
    3: {
      reason: "Exclusions need clear thresholds so we avoid funds that would conflict with your values and Anti-Greenwashing commitments.",
      regulatory_basis: "FCA Anti-Greenwashing Rule requires clear, evidence-based exclusion criteria.",
      consumer_duty_aspect: "Consumer Duty requires products to align with client values and expectations.",
      documentation_requirement: "Exclusion criteria and thresholds must be clearly documented and applied consistently.",
      potential_consequences: "Unclear exclusions could result in investments that conflict with client values."
    },
    4: {
      reason: "Impact goals are required evidence if we pursue Impact-labelled investments.",
      regulatory_basis: "FCA SDR rules require specific impact objectives for Impact-labelled products.",
      consumer_duty_aspect: "Consumer Duty requires clear outcomes and measurement for impact investments.",
      documentation_requirement: "Impact goals must be specific, measurable, and documented.",
      potential_consequences: "Vague impact goals could result in unsuitable impact investments or greenwashing."
    },
    5: {
      reason: "Stewardship preferences guide how actively managers should engage on your behalf.",
      regulatory_basis: "FCA guidance on stewardship requires consideration of client preferences for engagement activities.",
      consumer_duty_aspect: "Consumer Duty requires understanding client expectations for active ownership.",
      documentation_requirement: "Stewardship preferences must be documented and matched to manager capabilities.",
      potential_consequences: "Misaligned stewardship could result in engagement activities that don't meet client expectations."
    },
    6: {
      reason: "Reporting frequency ensures we deliver updates often enough to evidence sustainability outcomes.",
      regulatory_basis: "FCA SDR rules require appropriate reporting on sustainability outcomes and progress.",
      consumer_duty_aspect: "Consumer Duty requires ongoing communication about product performance and outcomes.",
      documentation_requirement: "Reporting preferences must be documented and delivery schedules maintained.",
      potential_consequences: "Inadequate reporting could prevent monitoring of sustainability outcomes."
    },
    7: {
      reason: "Understanding trade-off tolerance helps balance sustainability aims with performance expectations.",
      regulatory_basis: "FCA guidance requires clear communication about potential trade-offs in sustainable investing.",
      consumer_duty_aspect: "Consumer Duty requires clients to understand potential impacts on returns or risk.",
      documentation_requirement: "Trade-off tolerance must be documented and considered in product selection.",
      potential_consequences: "Misunderstanding trade-offs could lead to unsuitable risk/return profiles."
    }
  },
  SEGMENT_F_CONFIRMATION: {
    0: {
      reason: "I'll replay everything so you can confirm it's accurate before we generate any reports.",
      regulatory_basis: "COBS 9A.3.1 requires firms to provide clients with suitability reports containing specified information.",
      consumer_duty_aspect: "Consumer Duty requires clear communication and client understanding before finalizing advice.",
      documentation_requirement: "Client confirmation of accuracy must be documented before report generation.",
      potential_consequences: "Proceeding with inaccurate information could result in unsuitable advice and regulatory breaches."
    }
  }
};

// Enhanced audit logging system
export const createComplianceAuditEntry = (session, action, details = {}) => {
  const auditEntry = {
    id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date().toISOString(),
    session_id: session.id,
    stage: session.stage,
    action: action,
    details: details,
    regulatory_context: {
      applicable_rules: details.applicable_rules || [],
      compliance_status: details.compliance_status || 'compliant',
      risk_level: details.risk_level || 'low'
    },
    client_interaction: {
      user_input: details.user_input || null,
      system_response: details.system_response || null,
      comprehension_verified: details.comprehension_verified || false
    }
  };

  // Ensure audit trail exists
  if (!session.data.audit) {
    session.data.audit = {
      events: [],
      ip: null,
      explanation_shown: false,
      educ_pack_sent: false,
      guardrail_triggers: [],
      report_hash: null,
      compliance_checkpoints: []
    };
  }

  if (!Array.isArray(session.data.audit.events)) {
    session.data.audit.events = [];
  }

  session.data.audit.events.push(auditEntry);
  return auditEntry;
};

// Compliance validation checkpoints
export const validateComplianceCheckpoint = (session, checkpoint) => {
  const validationResults = {
    checkpoint: checkpoint,
    timestamp: new Date().toISOString(),
    passed: true,
    issues: [],
    recommendations: []
  };

  switch (checkpoint) {
    case 'suitability_information_complete':
      const profile = session.data?.client_profile || {};
      if (!profile.client_type) validationResults.issues.push('Client type not specified');
      if (!profile.objectives) validationResults.issues.push('Investment objectives not captured');
      if (!profile.horizon_years) validationResults.issues.push('Investment horizon not specified');
      if (!profile.risk_tolerance) validationResults.issues.push('Risk tolerance not assessed');
      if (!profile.capacity_for_loss) validationResults.issues.push('Capacity for loss not determined');
      break;

    case 'consent_obtained':
      const consent = session.data?.consent || {};
      if (!consent.data_processing?.granted) validationResults.issues.push('Data processing consent not obtained');
      if (consent.e_delivery?.granted === undefined) validationResults.issues.push('E-delivery preference not captured');
      break;

    case 'education_delivered':
      const audit = session.data?.audit || {};
      if (!audit.educ_pack_sent) validationResults.issues.push('Education pack not delivered');
      if (!session.data?.sustainability_preferences?.educ_pack_sent) {
        validationResults.issues.push('Education acknowledgment not recorded');
      }
      break;

    case 'sustainability_preferences_captured':
      const prefs = session.data?.sustainability_preferences || {};
      if (!prefs.preference_level) validationResults.issues.push('Preference level not specified');
      if (prefs.preference_level !== 'none' && (!prefs.labels_interest || prefs.labels_interest.length === 0)) {
        validationResults.issues.push('Label interests not captured for non-none preference level');
      }
      break;

    case 'guardrails_checked':
      const guardrails = session.data?.audit?.guardrail_triggers || [];
      const unconfirmedOverrides = guardrails.filter(g => 
        g.type === 'risk_capacity_override' && !g.confirmed_at
      );
      if (unconfirmedOverrides.length > 0) {
        validationResults.issues.push('Risk capacity override not confirmed');
      }
      break;
  }

  validationResults.passed = validationResults.issues.length === 0;
  
  // Add to compliance checkpoints
  if (!session.data.audit.compliance_checkpoints) {
    session.data.audit.compliance_checkpoints = [];
  }
  session.data.audit.compliance_checkpoints.push(validationResults);

  return validationResults;
};

// Generate compliance summary for advisors
export const generateComplianceSummary = (session) => {
  const audit = session.data?.audit || {};
  const events = audit.events || [];
  const checkpoints = audit.compliance_checkpoints || [];
  const guardrails = audit.guardrail_triggers || [];

  return {
    session_id: session.id,
    compliance_status: checkpoints.every(c => c.passed) ? 'compliant' : 'issues_identified',
    total_audit_events: events.length,
    compliance_checkpoints: checkpoints.length,
    guardrail_triggers: guardrails.length,
    key_milestones: {
      explanation_shown: audit.explanation_shown,
      education_delivered: audit.educ_pack_sent,
      consent_obtained: session.data?.consent?.data_processing?.granted || false,
      suitability_complete: !!session.data?.client_profile?.client_type,
      preferences_captured: !!session.data?.sustainability_preferences?.preference_level,
      summary_confirmed: !!session.data?.summary_confirmation?.client_summary_confirmed
    },
    outstanding_issues: checkpoints
      .filter(c => !c.passed)
      .flatMap(c => c.issues),
    last_updated: new Date().toISOString()
  };
};