package com.synfini.wallet.views.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.datasource.DriverManagerDataSource;

import javax.sql.DataSource;

@Configuration
public class SpringDbConfig {
  @Bean
  public DataSource pgDataSource(
    @Value("${spring.datasource.url}") String url,
    @Value("${spring.datasource.username}") String user,
    @Value("${spring.datasource.password}") String password,
    @Value("${spring.datasource.driver-class-name}") String driver
  ) {
    final DriverManagerDataSource dataSource = new DriverManagerDataSource(url, user, password);
    dataSource.setDriverClassName(driver);

    return dataSource;
  }
}
