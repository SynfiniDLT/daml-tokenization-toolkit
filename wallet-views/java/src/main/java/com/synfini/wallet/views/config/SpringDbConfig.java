package com.synfini.wallet.views.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.datasource.DriverManagerDataSource;

import javax.sql.DataSource;

@Configuration
public class SpringDbConfig {
  @Value("${spring.datasource.url}")
  public String url;
  @Value("${spring.datasource.username}")
  public String user;
  @Value("${spring.datasource.password}")
  public String password;
  @Value("${spring.datasource.driver-class-name}")
  public String driver;

  @Bean
  public DataSource pgDataSource() {
    final DriverManagerDataSource dataSource = new DriverManagerDataSource(url, user, password);
    dataSource.setDriverClassName(driver);

    return dataSource;
  }
}
