"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const housing_evaluations_1 = require("./housing-evaluations");
const dotenv_1 = require("dotenv");
(0, dotenv_1.config)();
async function main() {
    const args = process.argv.slice(2);
    const command = args[0];
    const scenario = args[1];
    console.log('🧪 Housing Search Evaluation Runner');
    console.log('==================================');
    if (!process.env.WEAVE_API_KEY) {
        console.error('❌ WEAVE_API_KEY is required to run evaluations');
        console.log('💡 Add WEAVE_API_KEY to your .env file');
        process.exit(1);
    }
    if (!process.env.OPENAI_API_KEY) {
        console.error('❌ OPENAI_API_KEY is required to run evaluations');
        console.log('💡 Add OPENAI_API_KEY to your .env file');
        process.exit(1);
    }
    try {
        switch (command) {
            case 'all':
                console.log('🚀 Running all housing search evaluations...\n');
                await (0, housing_evaluations_1.runHousingEvaluations)();
                break;
            case 'scenario':
                if (!scenario) {
                    console.error('❌ Scenario name required');
                    console.log('💡 Available scenarios: female_housemate, private_bath_budget, young_roommates, oakland_commute, combined');
                    process.exit(1);
                }
                console.log(`🚀 Running evaluations for scenario: ${scenario}\n`);
                await (0, housing_evaluations_1.runScenarioEvaluation)(scenario);
                break;
            case 'help':
            default:
                console.log(`
Usage: npm run eval [command] [scenario]

Commands:
  all                    Run all evaluations
  scenario <name>        Run evaluations for a specific scenario
  help                   Show this help message

Available scenarios:
  female_housemate       Tests for female roommate searches
  private_bath_budget    Tests for private bathroom under budget
  young_roommates        Tests for roommates under 30
  oakland_commute        Tests for commute to Oakland
  combined               Tests for complex multi-criteria searches

Examples:
  npm run eval all
  npm run eval scenario female_housemate
  npm run eval scenario private_bath_budget
`);
                break;
        }
    }
    catch (error) {
        console.error('❌ Evaluation failed:', error);
        process.exit(1);
    }
}
// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n👋 Evaluation interrupted by user');
    process.exit(0);
});
process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});
if (require.main === module) {
    main();
}
