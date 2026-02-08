// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title GenLayer Relay Example
/// @notice Example contract showing how to consume off-chain relays

interface IRelay {
    function getPrice(string calldata asset, string calldata vs) external view returns (uint256);
    function getWeather(string calldata city) external view returns (string memory);
    function getRandom() external view returns (uint256);
    function verifySignature(string calldata message, string calldata signature, string calldata secret) external view returns (bool);
}

contract RelayExample {
    // Example storage
    uint256 public lastRandom;
    string public lastWeather;
    mapping(string => uint256) public prices;

    IRelay public relay;

    constructor(address relayAddress) {
        relay = IRelay(relayAddress);
    }

    /// @notice Fetch price from relay
    function fetchPrice(string calldata asset, string calldata vs) external {
        uint256 value = relay.getPrice(asset, vs);
        prices[asset] = value;
    }

    /// @notice Fetch weather from relay
    function fetchWeather(string calldata city) external {
        string memory w = relay.getWeather(city);
        lastWeather = w;
    }

    /// @notice Fetch random number from relay
    function fetchRandom() external {
        uint256 r = relay.getRandom();
        lastRandom = r;
    }

    /// @notice Verify signature via relay
    function checkSignature(string calldata message, string calldata signature, string calldata secret) external view returns (bool) {
        return relay.verifySignature(message, signature, secret);
    }
}
