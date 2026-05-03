package com.zwallet.data.remote

import com.zwallet.domain.model.SwapQuote
import retrofit2.http.GET
import retrofit2.http.Query

interface ZWalletApi {
    @GET("/api/v1/swap/quote")
    suspend fun quote(@Query("from") from: String, @Query("to") to: String, @Query("amount") amount: Double): SwapQuote
}
