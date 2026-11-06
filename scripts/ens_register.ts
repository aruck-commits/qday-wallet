const plan = ["MockUSDC.mint(relayer, 100e6)", "approve ETHRegistrar", "makeCommitment(wallet owner)", "commit", "wait at least 60 seconds", "register name with QDayWallet as owner"];

if (!process.argv.includes("--execute")) {
  console.log(JSON.stringify({ ok: true, executed: false, reviewRequired: true, plan }));
  process.exit(0);
}
throw new Error("ENS registration remains review-locked; remove this guard only after human review");
