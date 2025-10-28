# Requirements Document

## Introduction

The ESG Client Interview Bot is an intelligent conversational system designed to guide financial planning clients through the initial interview and education process for ESG (Environmental, Social, and Governance) related investment products in the UK. The system ensures compliance with UK regulatory requirements including Consumer Duty of Care, COBS 9A suitability rules, and FCA SDR (Sustainability Disclosure Requirements) while educating clients on sustainable investment concepts and capturing their preferences for compliant record-keeping. The system follows a structured 8-segment conversation flow from explanation through delivery of personalized suitability reports.

## Glossary

- **ESG_Bot**: The conversational AI system that manages client interviews and education through structured conversation segments
- **Client**: Individual seeking financial advice on ESG investment products
- **Advisor**: Financial planner using the system to conduct compliant client interviews
- **KBS_Pathways**: Knowledge-based system frameworks that define the interview structure and SDR label mapping
- **FCA_Regulations**: Financial Conduct Authority rules governing investment advice in the UK, including COBS 9A and SDR
- **Consumer_Duty**: UK regulatory requirement for firms to act in clients' best interests with plain language and comprehension checks
- **Suitability_Report**: Compliant PDF document capturing client preferences, consent, and advisor recommendations
- **SDR_Labels**: FCA Sustainability Disclosure Requirements labels including Focus, Improvers, Impact, and Mixed Goals
- **Anti_Greenwashing_Rule**: FCA requirement that sustainability claims must be fair, clear, and evidence-backed
- **Conversation_Segments**: Eight structured phases: Explanation, Onboarding, Consent, Education, Options, Confirmation, Report, Delivery
- **Compliance_Record**: Documented evidence of regulatory adherence with audit trails and timestamps
- **Investment_Explorer**: Feature that matches client preferences to authorized investment universe

## Requirements

### Requirement 1

**User Story:** As an Advisor, I want the ESG_Bot to conduct structured 8-segment client interviews, so that I can ensure COBS 9A suitability compliance while efficiently gathering client information.

#### Acceptance Criteria

1. THE ESG_Bot SHALL progress through eight Conversation_Segments in sequence: Explanation, Onboarding, Consent, Education, Options, Confirmation, Report, Delivery
2. WHEN capturing suitability data, THE ESG_Bot SHALL collect client type, objectives, horizon, risk tolerance, capacity for loss, liquidity needs, and knowledge experience
3. THE ESG_Bot SHALL validate all mandatory fields before allowing progression to subsequent segments
4. WHEN risk tolerance exceeds capacity for loss, THE ESG_Bot SHALL require explicit client override confirmation
5. THE ESG_Bot SHALL maintain session state and allow resumption of incomplete conversations

### Requirement 2

**User Story:** As a Client, I want to receive clear education about ESG concepts and FCA SDR labels, so that I can make informed investment decisions.

#### Acceptance Criteria

1. THE ESG_Bot SHALL present structured education covering ESG basics, SDR_Labels, and Anti_Greenwashing_Rule requirements
2. THE ESG_Bot SHALL explain Focus, Improvers, Impact, and Mixed Goals labels with plain language definitions
3. WHEN clients request additional education, THE ESG_Bot SHALL provide detailed explanations and offer PDF resources
4. THE ESG_Bot SHALL require client acknowledgment of education before proceeding to preference capture
5. THE ESG_Bot SHALL log all educational requests in the Compliance_Record for advisor review

### Requirement 3

**User Story:** As a Client, I want to express my ESG preferences through structured pathways, so that my investment recommendations align with my values and comply with SDR requirements.

#### Acceptance Criteria

1. THE ESG_Bot SHALL offer three preference levels: none, high_level, or detailed
2. WHEN clients choose detailed preferences, THE ESG_Bot SHALL capture SDR_Labels interest, themes, exclusions with thresholds, impact goals, engagement importance, reporting frequency, and trade-off tolerance
3. WHERE Impact labels are selected, THE ESG_Bot SHALL require specific impact goals and reporting frequency preferences
4. THE ESG_Bot SHALL validate exclusion thresholds and require numeric values for fossil fuel exclusions
5. THE ESG_Bot SHALL map client preferences to KBS_Pathways for advisor review

### Requirement 4

**User Story:** As an Advisor, I want the system to generate compliant suitability reports with PDF output, so that I can meet Consumer_Duty and COBS 9A documentation requirements.

#### Acceptance Criteria

1. WHEN client confirmation is received, THE ESG_Bot SHALL generate a structured Suitability_Report using the approved template
2. THE ESG_Bot SHALL include client profile, sustainability preferences, advice outcome, and rationale in the report
3. THE ESG_Bot SHALL generate PDF artifacts with SHA-256 hash for audit integrity
4. THE ESG_Bot SHALL provide downloadable report URLs and preview text for client review
5. THE ESG_Bot SHALL timestamp all report generation events and store artifacts securely

### Requirement 5

**User Story:** As a Compliance Officer, I want the system to maintain comprehensive audit trails and guardrail triggers, so that all client interactions remain compliant and traceable.

#### Acceptance Criteria

1. THE ESG_Bot SHALL log all client interactions, educational requests, and extra questions with timestamps
2. THE ESG_Bot SHALL trigger guardrails for risk-capacity mismatches and short horizon-high risk combinations
3. THE ESG_Bot SHALL maintain session audit trails including IP addresses, consent timestamps, and report hashes
4. THE ESG_Bot SHALL validate session completeness against COBS 9A requirements before report generation
5. THE ESG_Bot SHALL provide compliance rationale explanations when clients ask "why do you need this information"

### Requirement 6

**User Story:** As a Client, I want to interact with the bot naturally and explore investment options, so that the interview process feels conversational and informative.

#### Acceptance Criteria

1. THE ESG_Bot SHALL integrate with OpenAI for natural language processing and compliance responses
2. WHEN clients ask educational questions, THE ESG_Bot SHALL provide contextual answers and log requests for advisor review
3. THE ESG_Bot SHALL offer Investment_Explorer functionality to match client preferences with authorized investment universe
4. THE ESG_Bot SHALL handle detours gracefully and provide resume prompts to return to structured flow
5. THE ESG_Bot SHALL support both free-form text and structured data input methods

### Requirement 7

**User Story:** As an Advisor, I want to access session data and manage client interactions, so that I can provide oversight and complete the advice process.

#### Acceptance Criteria

1. THE ESG_Bot SHALL provide session management APIs for listing, retrieving, and updating client sessions
2. THE ESG_Bot SHALL expose session data in structured JSON format for advisor dashboard integration
3. THE ESG_Bot SHALL support session state persistence with SQLite database storage
4. THE ESG_Bot SHALL allow advisors to append notes and finalize recommendations in the advice outcome
5. THE ESG_Bot SHALL provide session reset capabilities for testing and development purposes