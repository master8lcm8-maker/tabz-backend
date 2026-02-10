import { generateReferralCode } from "../services/codegen.service";
import { buildSharePayload } from "../services/share-payload.service";

console.log(buildSharePayload(generateReferralCode()));
