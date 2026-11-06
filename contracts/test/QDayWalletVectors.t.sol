// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;
import {Test} from "forge-std/Test.sol";
import {console2} from "forge-std/console2.sol";
import {stdJson} from "forge-std/StdJson.sol";
import {QDayWallet} from "../src/QDayWallet.sol";
import {MLDSAVerifier} from "mldsa-solidity/MLDSAVerifier.sol";
import {MLDSAKeyFactory} from "mldsa-solidity/MLDSAKeyFactory.sol";
import {ML_DSA_44} from "mldsa-solidity/IMLDSAVerifier.sol";
contract VectorTarget { uint256 public value; function set(uint256 next) external { value = next; } }
contract QDayWalletVectorsTest is Test {
    using stdJson for string;
    bytes internal pk; bytes internal validSig; bytes internal invalidSig; bytes internal callData; bytes32 internal intent; QDayWallet internal wallet; VectorTarget internal target; uint256 internal constant DEADLINE = 86401;
    function setUp() public {
        string memory fixture = vm.readFile("test/fixtures/pq.json"); pk = fixture.readBytes(".pk"); validSig = fixture.readBytes(".validSig"); invalidSig = fixture.readBytes(".invalidSig"); callData = fixture.readBytes(".scenario.callData"); intent = fixture.readBytes32(".scenario.intent");
        vm.warp(1); MLDSAKeyFactory factory = new MLDSAKeyFactory(); MLDSAVerifier verifier = new MLDSAVerifier(address(factory)); factory.registerA(ML_DSA_44, pk); factory.registerT(ML_DSA_44, pk);
        address wd = fixture.readAddress(".scenario.walletDeployer"); address td = fixture.readAddress(".scenario.targetDeployer"); vm.setNonce(wd, 0); vm.setNonce(td, 0); vm.prank(wd); wallet = new QDayWallet(address(this), verifier, pk); vm.prank(td); target = new VectorTarget(); assertEq(address(wallet), fixture.readAddress(".scenario.walletAddr")); assertEq(address(target), fixture.readAddress(".scenario.targetAddr"));
    }
    function testNobleVectorExecutesAgainstRealVerifier() public {
        uint256 beforeGas = gasleft(); wallet.executePq(intent, validSig, address(target), callData, DEADLINE); console2.log("executePq registered ML-DSA-44 gas", beforeGas - gasleft()); assertEq(target.value(), 7); assertEq(wallet.pqNonce(), 1); vm.expectRevert("intent"); wallet.executePq(intent, validSig, address(target), callData, DEADLINE); bytes32 nextIntent = wallet.currentIntent(address(target), callData, DEADLINE); vm.expectRevert("pq signature"); wallet.executePq(nextIntent, invalidSig, address(target), callData, DEADLINE); assertEq(wallet.pqNonce(), 1);
    }
}
