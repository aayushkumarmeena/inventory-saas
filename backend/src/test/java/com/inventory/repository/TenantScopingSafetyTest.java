package com.inventory.repository;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.data.jpa.repository.Query;

import java.lang.reflect.Method;
import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Guards against the most likely way this app's multi-tenant isolation breaks:
 * a future @Query method that filters by everything except tenant_id.
 *
 * Tenant scoping here is enforced by convention (every repository method takes
 * a tenantId and every custom @Query includes it) rather than by the ORM, so
 * there is no runtime backstop if a query is ever written without it — this
 * test is that backstop, at build time instead.
 *
 * A handful of methods legitimately scope by a foreign key (saleId, saleItemId,
 * customerId, supplierId) instead of tenantId directly, because that id was
 * only obtainable in the first place via an earlier tenant-scoped lookup. Those
 * are explicitly allow-listed below with the reason. Anything else missing
 * tenant scoping fails this test — either add "tenantId"/"tenant_id" to the
 * query, or add it to ALLOWED_INDIRECTLY_SCOPED with a one-line justification.
 *
 * NOTE: if you add a new @Repository interface, add its class to REPOSITORIES
 * below — this test does not do classpath scanning.
 */
@DisplayName("Repository @Query methods stay tenant-scoped")
class TenantScopingSafetyTest {

    private static final List<Class<?>> REPOSITORIES = List.of(
            AuditLogRepository.class,
            CustomerRepository.class,
            GstConfigRepository.class,
            GstInvoiceRepository.class,
            GstReturnPeriodRepository.class,
            HsnSacCodeRepository.class,
            PaymentRepository.class,
            ProductRepository.class,
            ProductBatchRepository.class,
            PurchaseRepository.class,
            PurchaseItemRepository.class,
            SaleRepository.class,
            SaleItemRepository.class,
            SaleReturnRepository.class,
            SaleReturnItemRepository.class,
            StockAdjustmentRepository.class,
            SupplierRepository.class,
            TenantRepository.class,
            UserRepository.class
    );

    // "ClassName#methodName" -> why it's fine that the @Query text has no tenantId/tenant_id.
    private static final Map<String, String> ALLOWED_INDIRECTLY_SCOPED = Map.ofEntries(
            Map.entry("PaymentRepository#sumBySaleId",
                    "saleId is only ever obtained via a prior tenant-scoped Sale lookup"),
            Map.entry("PurchaseRepository#countBySupplierId",
                    "supplierId is only ever obtained via a prior tenant-scoped Supplier lookup"),
            Map.entry("PurchaseRepository#sumBySupplierId",
                    "supplierId is only ever obtained via a prior tenant-scoped Supplier lookup"),
            Map.entry("SaleRepository#countByCustomerId",
                    "customerId is only ever obtained via a prior tenant-scoped Customer lookup"),
            Map.entry("SaleRepository#sumPaidByCustomerId",
                    "customerId is only ever obtained via a prior tenant-scoped Customer lookup"),
            Map.entry("SaleRepository#sumOutstandingByCustomerId",
                    "customerId is only ever obtained via a prior tenant-scoped Customer lookup"),
            Map.entry("SaleReturnItemRepository#sumReturnedQuantityBySaleItemId",
                    "saleItemId is only ever obtained via a prior tenant-scoped Sale lookup"),
            Map.entry("SaleReturnRepository#sumBySaleId",
                    "saleId is only ever obtained via a prior tenant-scoped Sale lookup")
    );

    @Test
    @DisplayName("every @Query either references tenant scoping or is explicitly allow-listed")
    void allCustomQueriesAreTenantScopedOrAllowed() {
        List<String> violations = new ArrayList<>();

        for (Class<?> repo : REPOSITORIES) {
            for (Method m : repo.getDeclaredMethods()) {
                Query query = m.getAnnotation(Query.class);
                if (query == null) continue;

                String key = repo.getSimpleName() + "#" + m.getName();
                String jpql = query.value().toLowerCase(Locale.ROOT);
                boolean scoped = jpql.contains("tenantid") || jpql.contains("tenant_id");

                if (!scoped && !ALLOWED_INDIRECTLY_SCOPED.containsKey(key)) {
                    violations.add(key + " -> " + query.value());
                }
            }
        }

        assertThat(violations)
                .withFailMessage(
                        "Found @Query method(s) with no tenant_id/tenantId condition and no allow-list " +
                        "entry — this can leak data across tenants:%n%s%n" +
                        "Fix the query, or if it's genuinely scoped indirectly (e.g. by a foreign key that " +
                        "was itself fetched tenant-scoped), add it to ALLOWED_INDIRECTLY_SCOPED with a reason.",
                        String.join("\n", violations))
                .isEmpty();
    }
}
