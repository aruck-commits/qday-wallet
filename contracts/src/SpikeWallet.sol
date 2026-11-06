// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {HegotaSupport, Devnet, Scope, SigParam} from "@forshtat/hegota-support/contracts/HegotaSupport.sol";

contract SpikeWallet is HegotaSupport(Devnet.ERC8421_WORKSHOP) {
    constructor() payable {}

    fallback() external payable {
        if (msg.data.length != 0) {
            require(sigparam(0, SigParam.SCHEME) == 0, "arbitrary only");
            require(sigdatacopy(0, sigparam(0, SigParam.SIGNATURE_LENGTH), 0).length == 2420, "payload length");
            for (uint256 i = 0; i < 60_000; ++i) assembly ("memory-safe") { pop(keccak256(0, 0)) }
        }
        approve(Scope.EXECUTION_AND_PAYMENT);
    }
}
