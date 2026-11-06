// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {HegotaSupport, Devnet, Scope} from "@forshtat/hegota-support/contracts/HegotaSupport.sol";
import {IMLDSAVerifier, ParamSet, ML_DSA_44} from "mldsa-solidity/IMLDSAVerifier.sol";
import {IERC1155Receiver} from "@openzeppelin/contracts/token/ERC1155/IERC1155Receiver.sol";

contract QDayWallet is HegotaSupport(Devnet.ERC8421_WORKSHOP) {
    address public immutable owner;
    IMLDSAVerifier public immutable verifier;
    bytes public pqPublicKey;
    uint64 public pqKeyVersion;
    uint256 public pqNonce;

    event PqKeyRotated(uint64 indexed version, bytes32 indexed pkHash);
    event PqExecuted(address indexed target, bytes32 indexed intentHash, uint256 nonce);

    constructor(address owner_, IMLDSAVerifier verifier_, bytes memory pk_) payable {
        require(pk_.length == 1312, "pk length");
        owner = owner_;
        verifier = verifier_;
        pqPublicKey = pk_;
    }

    fallback() external payable {
        if (msg.data.length != 0) revert("G1_LAYOUT_PENDING");
        approve(Scope.EXECUTION_AND_PAYMENT);
    }

    function onERC1155Received(address, address, uint256, uint256, bytes calldata)
        external
        pure
        returns (bytes4)
    {
        return IERC1155Receiver.onERC1155Received.selector;
    }

    function onERC1155BatchReceived(address, address, uint256[] calldata, uint256[] calldata, bytes calldata)
        external
        pure
        returns (bytes4)
    {
        return IERC1155Receiver.onERC1155BatchReceived.selector;
    }

    function currentIntent(address target, bytes calldata callData, uint256 deadline) public view returns (bytes32) {
        return keccak256(abi.encode("QDAY_INTENT_V1", block.chainid, address(this), target, keccak256(callData), pqNonce, deadline));
    }

    function executePq(bytes32 intent, bytes calldata pqSig, address target, bytes calldata callData, uint256 deadline)
        external
        payable
        returns (bytes memory result)
    {
        require(block.timestamp <= deadline, "expired");
        require(intent == currentIntent(target, callData, deadline), "intent");
        require(verifier.verify(ML_DSA_44, pqPublicKey, abi.encodePacked(intent), pqSig), "pq signature");
        uint256 nonce = pqNonce++;
        (bool ok, bytes memory returned) = target.call{value: msg.value}(callData);
        if (!ok) assembly ("memory-safe") { revert(add(returned, 32), mload(returned)) }
        emit PqExecuted(target, intent, nonce);
        return returned;
    }

    function rotatePqKey(bytes calldata newPk) external {
        require(msg.sender == address(this), "self only");
        require(newPk.length == 1312, "pk length");
        pqPublicKey = newPk;
        unchecked { ++pqKeyVersion; }
        emit PqKeyRotated(pqKeyVersion, keccak256(newPk));
    }

    function pqPkHash() external view returns (bytes32) { return keccak256(pqPublicKey); }
}
