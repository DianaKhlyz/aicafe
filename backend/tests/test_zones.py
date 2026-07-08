from app.services.zones import point_in_polygon

SQUARE = [[0.0, 0.0], [0.0, 10.0], [10.0, 10.0], [10.0, 0.0]]


def test_point_inside():
    assert point_in_polygon((5.0, 5.0), SQUARE)


def test_point_outside():
    assert not point_in_polygon((15.0, 5.0), SQUARE)
    assert not point_in_polygon((-1.0, 5.0), SQUARE)


def test_point_near_edge():
    assert point_in_polygon((9.999, 9.999), SQUARE)
    assert not point_in_polygon((10.001, 5.0), SQUARE)


def test_concave_polygon():
    # Г-образный полигон: выемка справа сверху
    concave = [[0, 0], [0, 10], [5, 10], [5, 5], [10, 5], [10, 0]]
    assert point_in_polygon((2.0, 8.0), concave)  # в верхней «ноге»
    assert not point_in_polygon((8.0, 8.0), concave)  # в выемке
    assert point_in_polygon((8.0, 2.0), concave)  # в нижней части
