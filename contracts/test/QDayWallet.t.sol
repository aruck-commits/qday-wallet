// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Test} from "forge-std/Test.sol";
import {QDayWallet} from "../src/QDayWallet.sol";
import {IMLDSAVerifier, ParamSet} from "mldsa-solidity/IMLDSAVerifier.sol";

contract MockVerifier is IMLDSAVerifier {
    bool public valid = true;
    function setValid(bool value) external { valid = value; }
    function verify(ParamSet, bytes calldata, bytes calldata, bytes calldata) external view returns (bool) { return valid; }
    function supportsParamSet(ParamSet) external pure returns (bool) { return true; }
    function supportsInterface(bytes4) external pure returns (bool) { return true; }
}

contract Target { uint256 public value; function set(uint256 next) external { value = next; } }

contract QDayWalletTest is Test {
    MockVerifier internal verifier;
    QDayWallet internal wallet;
    Target internal target;
    uint256 internal deadline;
    function setUp() public { verifier = new MockVerifier(); wallet = new QDayWallet(address(this), verifier, new bytes(1312)); target = new Target(); deadline = block.timestamp + 1 days; }
    function testExecutePqBumpsNonceAndRejectsReplay() public {
        bytes memory data = abi.encodeCall(Target.set, (7)); bytes32 intent = wallet.currentIntent(address(target), data, deadline);
        wallet.executePq(intent, hex"01", address(target), data, deadline); assertEq(target.value(), 7); assertEq(wallet.pqNonce(), 1);
        vm.expectRevert("intent"); wallet.executePq(intent, hex"01", address(target), data, deadline);
    }
    function testRotatePqKeyRequiresPqPath() public {
        bytes memory next = new bytes(1312); next[0] = 0x42; bytes memory data = abi.encodeCall(QDayWallet.rotatePqKey, (next));
        bytes32 intent = wallet.currentIntent(address(wallet), data, deadline); wallet.executePq(intent, hex"01", address(wallet), data, deadline);
        assertEq(wallet.pqKeyVersion(), 1); assertEq(wallet.pqPublicKey(), next);
    }
    function testRejectsInvalidSignature() public { verifier.setValid(false); assertFalse(verifier.valid()); assertFalse(verifier.verify(ParamSet.wrap(0), new bytes(1312), hex"01", hex"01")); bytes memory data = abi.encodeCall(Target.set, (1)); bytes32 intent = wallet.currentIntent(address(target), data, deadline); vm.expectRevert("pq signature"); wallet.executePq(intent, hex"01", address(target), data, deadline); assertEq(wallet.pqNonce(), 0); }
    function testRejectsExpiredIntent() public {
        bytes memory data = abi.encodeCall(Target.set, (1));
        vm.warp(deadline + 1);
        bytes32 intent = wallet.currentIntent(address(target), data, deadline);
        vm.expectRevert("expired");
        wallet.executePq(intent, hex"01", address(target), data, deadline);
    }
    function testAcceptsErc1155HooksAndRejectsUnknownSelector() public {
        assertEq(wallet.onERC1155Received(address(this), address(0), 1, 1, ""), bytes4(0xf23a6e61));
        uint256[] memory ids = new uint256[](1); uint256[] memory values = new uint256[](1);
        assertEq(wallet.onERC1155BatchReceived(address(this), address(0), ids, values, ""), bytes4(0xbc197c81));
        (bool ok,) = address(wallet).call(hex"deadbeef");
        assertFalse(ok);
    }
}
