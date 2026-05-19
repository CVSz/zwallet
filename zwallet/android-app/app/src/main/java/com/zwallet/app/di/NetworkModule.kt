package com.zwallet.app.di

import com.squareup.moshi.Moshi
import com.zwallet.data.remote.ZWalletApi
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import okhttp3.CertificatePinner
import okhttp3.OkHttpClient
import retrofit2.Retrofit
import retrofit2.converter.moshi.MoshiConverterFactory
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object NetworkModule {
    @Provides
    @Singleton
    fun provideOkHttpClient(): OkHttpClient {
        val certPinner = CertificatePinner.Builder()
            .add("api.zwallet.com", "sha256/afWiKY3RxoMmL6yVxwM9f6QxWQGoaXwGZ0k2v0n1M9U=")
            .add("api.zwallet.com", "sha256/3W2J7g9X8f0u6m7J9YnE3wB9nIY2k4I7m9dXQ0u5w7Q=")
            .build()

        return OkHttpClient.Builder()
            .certificatePinner(certPinner)
            .build()
    }

    @Provides
    @Singleton
    fun provideApi(client: OkHttpClient): ZWalletApi = Retrofit.Builder()
        .baseUrl("https://api.zwallet.com")
        .addConverterFactory(MoshiConverterFactory.create(Moshi.Builder().build()))
        .client(client)
        .build()
        .create(ZWalletApi::class.java)
}
