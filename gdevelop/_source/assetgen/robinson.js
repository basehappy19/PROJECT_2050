// Robinson projection (Snyder table), shared by generator and game
const ROB = [[1.0000,0.0000],[0.9986,0.0620],[0.9954,0.1240],[0.9900,0.1860],[0.9822,0.2480],[0.9730,0.3100],[0.9600,0.3720],[0.9427,0.4340],[0.9216,0.4958],[0.8962,0.5571],[0.8679,0.6176],[0.8350,0.6769],[0.7986,0.7346],[0.7597,0.7903],[0.7186,0.8435],[0.6732,0.8936],[0.6213,0.9394],[0.5722,0.9761],[0.5322,1.0000]];
function robinson(lat, lon, lon0){
  let l = lon - lon0; while (l < -180) l += 360; while (l > 180) l -= 360;
  const a = Math.min(90, Math.abs(lat)) / 5, i = Math.min(17, Math.floor(a)), f = a - i;
  const X = ROB[i][0] + (ROB[i+1][0] - ROB[i][0]) * f, Y = ROB[i][1] + (ROB[i+1][1] - ROB[i][1]) * f;
  return [0.8487 * X * l * Math.PI / 180, 1.3523 * Y * Math.sign(lat)];
}
