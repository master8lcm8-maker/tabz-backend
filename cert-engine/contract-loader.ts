export function loadContract(pillar: string) {
  if (pillar === "pillar3") {
    return require("../contracts/pillar3/pillar3.contract").Pillar3Contract;
  }
  if (pillar === "pillar4") {
    return require("../contracts/pillar4/pillar4.contract").Pillar4Contract;
  }
  if (pillar === "pillar5") {
    return require("../contracts/pillar5/pillar5.contract").Pillar5Contract;
  }

  throw new Error("Unknown pillar " + pillar);
}
