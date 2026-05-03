package com.zwallet.app.di

import com.zwallet.data.repository.WalletRepositoryImpl
import com.zwallet.domain.repository.WalletRepository
import dagger.Binds
import dagger.Module
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
abstract class AppModule {
    @Binds @Singleton abstract fun bindWalletRepo(impl: WalletRepositoryImpl): WalletRepository
}
