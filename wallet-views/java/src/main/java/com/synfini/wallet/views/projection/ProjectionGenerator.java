package com.synfini.wallet.views.projection;

import akka.grpc.GrpcClientSettings;
import com.daml.projection.BatchRows;
import com.daml.projection.JdbcAction;
import com.daml.projection.Project;
import com.daml.projection.Projection;
import com.daml.projection.javadsl.BatchSource;
import com.daml.projection.javadsl.Control;
import com.daml.projection.javadsl.Projector;

public interface ProjectionGenerator<LedgerEvent, DomainEvent> {
  BatchSource<LedgerEvent> source(GrpcClientSettings grpcClientSettings);

  Projection<LedgerEvent> projection();

  Project<LedgerEvent, DomainEvent> project();

  BatchRows<DomainEvent, JdbcAction> batchRows();

  default Control control(GrpcClientSettings grpcClientSettings, Projector<JdbcAction> projector) {
    return projector.projectRows(source(grpcClientSettings), projection(), batchRows(), project());
  }
}
