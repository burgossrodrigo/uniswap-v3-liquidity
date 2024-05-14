import { ethers, JsonRpcProvider } from 'ethers'
import { ERC20__factory, NFPM__factory, V3Factory__factory, V3Pool__factory } from './types/ethers-contracts'
require('dotenv').config()

const TICK_BASE = 1.0001;
const PRICE_RANGE_PERCENT = 0.05
const AMOUNT = 300
const tickSpacing = 60;

const main = async () => {
    try {
        const provider = new JsonRpcProvider(process.env.RPC_URL)
        const wallet = new ethers.Wallet(process.env.PRIVATE_KEY as string, provider)
    
        const TOKEN_A = ERC20__factory.connect(process.env.TOKEN_A as string, wallet)
        const TOKEN_B = ERC20__factory.connect(process.env.TOKEN_B as string, wallet)
        const NFPM = NFPM__factory.connect(process.env.NFPM as string, wallet)
        const uniswapV3Factory = V3Factory__factory.connect(process.env.UNISWAP_V3_FACTORY as string, wallet)
    
        const poolAddress = await uniswapV3Factory.getPool(process.env.TOKEN_A as string, process.env.TOKEN_B as string, 3000)
    
        const V3Pool = V3Pool__factory.connect(poolAddress, wallet)
        
    
        const [ decimalsA, decimalsB ] = await Promise.all([TOKEN_A.decimals(), TOKEN_B.decimals()])

        // const mintTokenA = await TOKEN_A.mint(wallet.address, String(formatAmount(AMOUNT, Number(decimalsA))))
        // const mintTokenB = await TOKEN_B.mint(wallet.address, String(formatAmount(AMOUNT, Number(decimalsB))))

        // await mintTokenA.wait()
        // await mintTokenB.wait()

        const balanceA = await TOKEN_A.balanceOf(wallet.address)
        const balanceB = await TOKEN_B.balanceOf(wallet.address)
    
        console.log(balanceA.toString(), balanceB.toString(), 'balances')
        // const formatedAmmountA = formatAmount(Number(formatAmountFrom(Number(balanceA), Number(decimalsA))), Number(decimalsA))
        // const formatedAmmountB = formatAmount(Number(formatAmountFrom(Number(balanceA), Number(decimalsA))), Number(decimalsB))
    
        // const sqrtPrice = priceToSqrtPrice(1, Number(decimalsA), Number(decimalsB))
    
        // const initializePoolTx = await V3Pool.initialize(BigInt(sqrtPrice))
    
        // const initializePoolReceipt = await initializePoolTx.wait()
    
        const slot0 = await V3Pool.slot0()
        const token0 = await V3Pool.token0()
        const token1 = await V3Pool.token1()
        const tickSpacing = await V3Pool.tickSpacing()
        
        const sqrtPriceX96 = Number(slot0.sqrtPriceX96)
        const price = sqrtPriceToPrice(sqrtPriceX96, Number(decimalsA), Number(decimalsB))
    
        const tickLower = calculateTickRange(price, PRICE_RANGE_PERCENT, Number(tickSpacing)).tickLower
        const tickerUpper = calculateTickRange(price, PRICE_RANGE_PERCENT, Number(tickSpacing)).tickUpper
    
        // const approveATx = await TOKEN_A.approve(process.env.NFPM as string, String(balanceA))
        // const approveBTx = await TOKEN_B.approve(process.env.NFPM as string, String(balanceB))
    
        // const approveAReceipt = await approveATx.wait()
        // const approveBReceipt = await approveBTx.wait()
    
        const mintParams = {
            nonFungibleAddress: process.env.NFPM as string,
            token0: token0,
            token1: token1,
            fee: 3000,
            tickLower: tickLower,
            tickUpper: tickerUpper,
            amount0Desired: String(balanceA / BigInt(2)),
            amount1Desired: String(balanceB / BigInt(2)),
            amount0Min: 0,
            amount1Min: 0,
            recipient: wallet.address,
            deadline: Math.floor(Date.now() / 1000) + 60 * 200
        }

        console.log(mintParams, 'mintParams')
        

        const mintTx = await NFPM.mint(mintParams, { gasLimit: "200000"})

        console.log(mintTx)
    
        const mintReceipt = await mintTx.wait()
    
        return { 
            "mintTx": mintReceipt, 
            // "approveAReceipt": approveAReceipt, 
            // "approveBReceipt": approveBReceipt
        } 

    } catch (error: Error | any) {
        throw new Error(error.message)
    }
}

const sqrtPriceToPrice = (sqrtPriceX96: number, decimals0: number, decimals1: number): number => {
    const priceMath = Math.pow(sqrtPriceX96, 2) / Math.pow(2, 192)
    const decimalsAdjustment = Math.pow(10, decimals0 - decimals1)
    return priceMath * decimalsAdjustment
}

const priceToSqrtPrice = (price: number, decimals0: number, decimals1: number): number => {
    const priceMath = price / Math.pow(10, decimals0 - decimals1)
    return Math.sqrt(priceMath * Math.pow(2, 192))
}

function calculateTickRange(price: number, percentage: number, tickSpacing: number): { tickLower: number, tickUpper: number } {
    const lowerPriceBound = price * (1 - percentage);
    const upperPriceBound = price * (1 + percentage);

    const tickLower = calculateTickLower(lowerPriceBound, tickSpacing);
    const tickUpper = calculateTickUpper(upperPriceBound, tickSpacing);

    return { tickLower, tickUpper };
}

function priceToTick(price: number, tickSpacing: number): number {
    const logBase = Math.log(1.0001);
    return Math.floor(Math.log(price) / logBase / tickSpacing) * tickSpacing;
}

function calculateTickUpper(price: number, tickSpacing: number): number {
    const tick = priceToTick(price, tickSpacing);
    return tick + (tickSpacing - (tick % tickSpacing));
}

function calculateTickLower(price: number, tickSpacing: number): number {
    return priceToTick(price, tickSpacing);
}

const formatAmount = (amount: number, decimals: number): BigInt => {
    return BigInt(amount * Math.pow(10, decimals))
}

const formatAmountFrom = (amount: number, decimals: number): BigInt => {
    return BigInt(Number(amount) / Math.pow(10, Number(decimals)))
}

main().then((res: any) => {
    console.log(res)
})

    // FOR A MATTER OF TEST, I'VE DEPLOYED A POOL WITH THE TOKENS I HAVE IN MY WALLET

    // const uniswapV3Factory = V3Factory__factory.connect(process.env.UNISWAP_V3_FACTORY as string, wallet)


    // const tx = await uniswapV3Factory.createPool(
    //     process.env.TOKEN_A as string, 
    //     process.env.TOKEN_B as string, 
    //     3000
    // )

    // const receipt = await tx.wait()
    // return receipt