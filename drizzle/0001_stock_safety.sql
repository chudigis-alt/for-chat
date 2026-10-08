CREATE TRIGGER reserve_stock BEFORE INSERT ON order_items BEGIN
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM products WHERE id=NEW.product_id AND active=1 AND deleted=0 AND stock>=NEW.quantity) THEN RAISE(ABORT,'stock unavailable or product inactive') END;
 UPDATE products SET stock=stock-NEW.quantity,updated_at=CURRENT_TIMESTAMP WHERE id=NEW.product_id;
 INSERT INTO inventory_movements(product_id,delta,reason,order_id) VALUES(NEW.product_id,-NEW.quantity,'Order reserved',NEW.order_id);
END;
--> statement-breakpoint
CREATE TRIGGER restore_cancelled_stock AFTER UPDATE OF status ON orders WHEN NEW.status='Cancelled' AND OLD.status<>'Cancelled' BEGIN
 UPDATE products SET stock=stock+(SELECT SUM(quantity) FROM order_items WHERE order_id=NEW.id AND product_id=products.id),updated_at=CURRENT_TIMESTAMP WHERE id IN(SELECT product_id FROM order_items WHERE order_id=NEW.id);
 INSERT INTO inventory_movements(product_id,delta,reason,order_id) SELECT product_id,quantity,'Cancelled order restored',NEW.id FROM order_items WHERE order_id=NEW.id;
END;
--> statement-breakpoint
CREATE TRIGGER final_order_status BEFORE UPDATE OF status ON orders WHEN OLD.status IN ('Cancelled','Completed') AND NEW.status<>OLD.status BEGIN
 SELECT RAISE(ABORT,'Final order status cannot change');
END;
--> statement-breakpoint
CREATE UNIQUE INDEX payments_proof_unique ON payments(proof_id) WHERE proof_id IS NOT NULL;
