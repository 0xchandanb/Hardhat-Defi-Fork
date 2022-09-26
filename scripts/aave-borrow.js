const { ethers, getNamedAccounts, network } = require("hardhat")
const { BigNumber } = require("@ethersproject/bignumber")
const { getWeth, AMOUNT } = require("../scripts/getWeth.js")
const { networkConfig } = require("../helper-hardhat-config")

async function main() {
    await getWeth()
    const {deployer} = await getNamedAccounts()
    const lendingPool = await getLendingPool(deployer)

    // Deposit
    const wethTokenAddress = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"
    console.log("Approving...")
    await  approveErc20(wethTokenAddress , lendingPool.address, AMOUNT , deployer)
    console.log(`Approved ${AMOUNT} WETH to the Lending Pool✅`)
    const deposit = await lendingPool.deposit(wethTokenAddress , AMOUNT , deployer , 0)
    console.log("Depositing...")
    await deposit.wait()
    console.log("Deposited  ✅")

    // Borrow
    let{availableBorrowsETH , totalDebtETH} = await getBorrowedUserData(lendingPool ,deployer)
    const daiPrice = await getDaiPrice()
    const _daiPriceNumber = daiPrice.toNumber()
    console.log(`DAI / ETH : ${daiPrice}`)
    const amountDaiToBorrow = availableBorrowsETH.toString() *0.95 * (1 / _daiPriceNumber)
    console.log(`You can borrow : ${amountDaiToBorrow} DAI`)
    await borrowDai("0x6B175474E89094C44Da98b954EedeAC495271d0F" , lendingPool ,  amountDaiToBorrow,deployer)
    await getBorrowedUserData(lendingPool, deployer)



    // Repay
    await repay(amountDaiToBorrow , daiTokenAddress , lendingPool , deployer)
    await getBorrowedUserData(lendingPool , deployer)
}

async function repay(amount , daiAddress , lendingPool , account){
    console.log("Repaying debt...")
    await approveErc20(daiAddress, lendingPool.address , amount , account)
    const repayTx = await lendingPool.repay(daiAddress ,amount , 1 ,account)
    await repayTx.wait()
    console.log("Payed ✅")

}

async function borrowDai(
    daiAddress,
    lendingPool,
    amountDaiToBorrowWei,
    account

){
    console.log(`Borrowing ·{amountDaiToBorrow} DAI`)
    const borrowTx = await lendingPool.borrow(
        daiAddress,
        amountDaiToBorrowWei,
        1,
        0,
        account,
        
    )
    await borrowTx.wait()
    console.log("Borrowed ✅")
}

async function approveErc20(erc20Address, spenderAddress, amount, signer) {
    const erc20Token = await ethers.getContractAt("IWeth", erc20Address, signer)
    txResponse = await erc20Token.approve(spenderAddress, amount)
    await txResponse.wait(1)
}


async function getDaiPrice(){
    const daiEthPriceFeed = await ethers.getContractAt("AggregatorV3Interface" , "0x773616E4d11A78F511299002da57A0a94577F1f4")
    const price = await daiEthPriceFeed.latestRoundData()
    return price

}

async function getBorrowedUserData( lendingPool , account){
    console.log("AAVE : Loading Dashboard...")
    const {totalCollateralETH , totalDebtETH , availableBorrowsETH} = await lendingPool.getUserAccountData(account)
    console.log(`UserData : \n Total collateral: ${totalCollateralETH} ETH \n Total Debt: ${totalDebtETH} \n Balance left : ${availableBorrowsETH} ETH`)
    return {availableBorrowsETH , totalDebtETH}


}

async function getLendingPool(account) {
    const lendingPoolAddressesProvider = await ethers.getContractAt(
        "ILendingPoolAddressesProvider",
        networkConfig[network.config.chainId].lendingPoolAddressesProvider,
        account
    )
    const lendingPoolAddress = await lendingPoolAddressesProvider.getLendingPool()
    const lendingPool = await ethers.getContractAt("ILendingPool", lendingPoolAddress, account)
    return lendingPool
}
main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error)
        process.exit(1)
    })