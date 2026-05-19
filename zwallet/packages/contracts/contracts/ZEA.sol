// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Pausable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title ZEA Stablecoin
 * @author Zeaz Principal Engineering
 * @notice ZEA is a production-grade stablecoin with blacklist, pause, and role-based minting.
 * @dev Implements OpenZeppelin v5.0.0 security patterns.
 */
contract ZEA is ERC20, ERC20Burnable, ERC20Pausable, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant BLACKLISTER_ROLE = keccak256("BLACKLISTER_ROLE");

    mapping(address => bool) private _blacklist;

    // Custom Errors
    error AddressBlacklisted(address account);
    error UnauthorizedMinter(address account);

    // Events
    event Blacklisted(address indexed account);
    event Unblacklisted(address indexed account);

    /**
     * @notice Initializes the ZEA token with administrative control.
     * @param admin The address granted the default admin role.
     */
    constructor(address admin) ERC20("ZEA Stablecoin", "ZEA") {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
    }

    /**
     * @notice Mints ZEA to a specified address.
     * @dev Restricted to MINTER_ROLE.
     * @param to The recipient address.
     * @param amount The amount of ZEA to mint (atomic units).
     */
    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) {
        if (_blacklist[to]) revert AddressBlacklisted(to);
        _mint(to, amount);
    }

    /**
     * @notice Pauses all token transfers.
     * @dev Restricted to DEFAULT_ADMIN_ROLE.
     */
    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    /**
     * @notice Unpauses all token transfers.
     * @dev Restricted to DEFAULT_ADMIN_ROLE.
     */
    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    /**
     * @notice Adds an address to the transfer blacklist.
     * @dev Restricted to BLACKLISTER_ROLE.
     * @param account The address to block.
     */
    function blacklistAddress(address account) external onlyRole(BLACKLISTER_ROLE) {
        _blacklist[account] = true;
        emit Blacklisted(account);
    }

    /**
     * @notice Removes an address from the transfer blacklist.
     * @dev Restricted to BLACKLISTER_ROLE.
     * @param account The address to unblock.
     */
    function unblacklistAddress(address account) external onlyRole(BLACKLISTER_ROLE) {
        _blacklist[account] = false;
        emit Unblacklisted(account);
    }

    /**
     * @notice Returns whether an address is currently blacklisted.
     * @param account The address to check.
     */
    function isBlacklisted(address account) public view returns (bool) {
        return _blacklist[account];
    }

    /**
     * @dev Hook that is called before any transfer of tokens.
     * Overridden to enforce blacklist and pause constraints.
     */
    function _update(address from, address to, uint256 value)
        internal
        virtual
        override(ERC20, ERC20Pausable)
    {
        if (_blacklist[from]) revert AddressBlacklisted(from);
        if (_blacklist[to]) revert AddressBlacklisted(to);
        super._update(from, to, value);
    }
}
