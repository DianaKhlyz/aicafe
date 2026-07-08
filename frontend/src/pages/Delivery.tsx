// Страница «Доставка»: карта зон (Leaflet + OpenStreetMap — 0 ₽, без ключей)
// и условия по зонам. Полигоны приходят из iiko через наш бэк — заказчик
// редактирует зоны в iiko, страница перерисовывается сама.
// Загружается лениво (React.lazy), чтобы Leaflet не тяжелил основной бандл.
import { useQuery } from "@tanstack/react-query";
import { LatLngBounds } from "leaflet";
import { MapContainer, Polygon, TileLayer, Tooltip } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { api } from "../api/client";

const ZONE_COLORS = ["#c26a3d", "#6f6a63", "#3d7ac2"];

export function DeliveryPage() {
  const { data: zones, isPending } = useQuery({
    queryKey: ["delivery-zones"],
    queryFn: async () => {
      const { data, error } = await api.GET("/api/delivery/zones");
      if (error) throw error;
      return data;
    },
  });

  if (isPending) return <p>Загружаем зоны доставки…</p>;
  if (!zones || zones.length === 0) return <h1>Доставка временно недоступна</h1>;

  const allPoints = zones.flatMap((zone) => zone.polygon) as [number, number][];
  const bounds = new LatLngBounds(allPoints);

  return (
    <div>
      <h1>Доставка и оплата</h1>
      <MapContainer bounds={bounds} className="zones-map" scrollWheelZoom={false}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {zones.map((zone, index) => (
          <Polygon
            key={zone.name}
            positions={zone.polygon as [number, number][]}
            pathOptions={{
              color: ZONE_COLORS[index % ZONE_COLORS.length],
              fillOpacity: 0.15,
            }}
          >
            <Tooltip sticky>
              {zone.name}: доставка{" "}
              {zone.delivery_price > 0 ? `${zone.delivery_price} ₽` : "бесплатно"}, от{" "}
              {zone.min_order} ₽
            </Tooltip>
          </Polygon>
        ))}
      </MapContainer>

      <ul className="zone-conditions">
        {zones.map((zone, index) => (
          <li key={zone.name}>
            <span
              className="zone-swatch"
              style={{ background: ZONE_COLORS[index % ZONE_COLORS.length] }}
            />
            <strong>{zone.name}</strong>: доставка{" "}
            {zone.delivery_price > 0 ? `${zone.delivery_price} ₽` : "бесплатная"}, минимальный
            заказ {zone.min_order} ₽
          </li>
        ))}
      </ul>
      <p className="form-hint">
        Оплата: СБП или картой онлайн при оформлении. Точный адрес проверяется в корзине до
        оплаты.
      </p>
    </div>
  );
}
