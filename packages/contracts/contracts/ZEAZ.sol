// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Pausable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title ZEAZ Utility Token
 * @author Zeaz Principal Engineering
 * @notice ZEAZ is the utility and governance token for the zWallet ecosystem.
 * @dev Implements a hard maximum supply cap and OpenZeppelin v5.0.0 patterns.
 */
contract ZEAZ is ERC20, ERC20Burnable, ERC20Pausable, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    uint256 public constant MAX_SUPPLY = 1_000_000_000 * 10**18;

    error CapExceeded(uint256 amount, uint256 cap);

    /**
     * @notice Initializes the ZEAZ token with administrative control.
     * @param admin The address granted the default admin role.
     */
    constructor(address admin) ERC20("ZEAZ Token", "ZEAZ") {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
    }

    /**
     * @notice Mints ZEAZ to a specified address.
     * @dev Restricted to MINTER_ROLE. Enforces the hard MAX_SUPPLY cap.
     * @param to The recipient address.
     * @param amount The amount of ZEAZ to mint (atomic units).
     */
    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) {
        if (totalSupply() + amount > MAX_SUPPLY) revert CapExceeded(amount, MAX_SUPPLY);
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
     * @dev Hook that is called before any transfer of tokens.
     */
    function _update(address from, address to, uint256 value)
        internal
        virtual
        override(ERC20, ERC20Pausable)
    {
        super._update(from, to, value);
    }
}
