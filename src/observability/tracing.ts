// Side-effect entry: imported FIRST by main.ts so tracing starts before anything else loads.
// All logic lives in tracing.config.ts so tests can import it without starting the SDK.
import { startTracing } from './tracing.config';

startTracing(process.env);
