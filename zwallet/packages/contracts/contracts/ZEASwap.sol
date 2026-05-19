// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title ZEASwap Engine
 * @author Zeaz Principal Engineering
 * @notice An atomic token swap engine facilitating ZEA <-> ZEAZ exchanges.
 * @dev Uses SafeERC20 for all transfers and ReentrancyGuard for security.
 */
contract ZEASwap is ReentrancyGuard, AccessControl {
    using SafeERC20 for IERC20;

    IERC20 public immutable zea;
    IERC20 public immutable zeaz;

    uint256 public constant SWAP_FEE_BPS = 30; // 0.3%
    uint256 public constant BPS_DENOMINATOR = 10_000;

    // Custom Errors
    error ZeroAmount();
    error InsufficientLiquidity();
    error TransferFailed();

    // Events
    event Swapped(address indexed user, address indexed tokenIn, uint256 amountIn, uint256 amountOut);
    event StablecoinBurned(address indexed user, uint256 amount);

    /**
     * @notice Initializes the swap engine with token references.
     * @param _zea Address of the ZEA Stablecoin.
     * @param _zeaz Address of the ZEAZ Utility Token.
     */
    constructor(address _zea, address _zeaz) {
        zea = IERC20(_zea);
        zeaz = IERC20(_zeaz);
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    /**
     * @notice Swaps ZEA stablecoins for ZEAZ utility tokens.
     * @dev Calculates a 0.3% fee before execution.
     * @param amountZEA The amount of ZEA to swap.
     */
    function swapZEAforZEAZ(uint256 amountZEA) external nonReentrant {
        if (amountZEA == 0) revert ZeroAmount();

        uint256 fee = (amountZEA * SWAP_FEE_BPS) / BPS_DENOMINATOR;
        uint256 amountOut = amountZEA - fee;

        if (zeaz.balanceOf(address(this)) < amountOut) revert InsufficientLiquidity();

        zea.safeTransferFrom(msg.sender, address(this), amountZEA);
        zeaz.safeTransfer(msg.sender, amountOut);

        emit Swapped(msg.sender, address(zea), amountZEA, amountOut);
    }

    /**
     * @notice Swaps ZEAZ utility tokens for ZEA stablecoins.
     * @dev Calculates a 0.3% fee before execution.
     * @param amountZEAZ The amount of ZEAZ to swap.
     */
    function swapZEAZforZEA(uint256 amountZEAZ) external nonReentrant {
        if (amountZEAZ == 0) revert ZeroAmount();

        uint256 fee = (amountZEAZ * SWAP_FEE_BPS) / BPS_DENOMINATOR;
        uint256 amountOut = amountZEAZ - fee;

        if (zea.balanceOf(address(this)) < amountOut) revert InsufficientLiquidity();

        zeaz.safeTransferFrom(msg.sender, address(this), amountZEAZ);
        zea.safeTransfer(msg.sender, amountOut);

        emit Swapped(msg.sender, address(zeaz), amountZEAZ, amountOut);
    }

    /**
     * @notice Permanently burns ZEA from the caller's balance to decrease supply.
     * @dev Calls the burn function on the ZEA contract.
     * @param amountZEA The amount of ZEA to destroy.
     */
    function burnStablecoin(uint256 amountZEA) external nonReentrant {
        if (amountZEA == 0) revert ZeroAmount();

        // Interface with Burnable extension
        (bool success, ) = address(zea).call(
            abi.encodeWithSignature("burnFrom(address,uint256)", msg.sender, amountZEA)
        );
        if (!success) revert TransferFailed();

        emit StablecoinBurned(msg.sender, amountZEA);
    }

    /**
     * @notice Emergency withdrawal for administrative liquidity management.
     * @param token The token address to withdraw.
     * @param amount The amount to withdraw.
     */
    function withdrawLiquidity(address token, uint256 amount) external onlyRole(DEFAULT_ADMIN_ROLE) {
        IERC20(token).safeTransfer(msg.sender, amount);
    }
}
