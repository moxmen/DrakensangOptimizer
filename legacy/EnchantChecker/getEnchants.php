<?php
header("Content-Type: application/json; charset=UTF-8");

$conn = mysql_connect('http://sql.free.fr/phpMyAdmin/', 'privateLogin', 'privatePassword');
mysql_select_db('privateLogin',$conn);

if (!function_exists('json_decode')) {
    function json_decode($content, $assoc=false) {
        require_once 'JSONclass.php';
        if ($assoc) { $json = new Services_JSON(SERVICES_JSON_LOOSE_TYPE); }
        else { $json = new Services_JSON; }
        return $json->decode($content);
    }
}
$postdata = file_get_contents("php://input");
$request = json_decode($postdata);
$job = $request->job;
$slot = $request->slot;
$rarity = $request->rarity;

$query = "SELECT MinLevel, MaxLevel, Modifiers, MinMod, MaxMod, Probas FROM enchantments
		  WHERE (enchantments.Rarity = '$rarity' OR enchantments.Rarity = 'All') 
		  AND (enchantments.Class = '$job' OR enchantments.Class = 'All') 
		  AND enchantments.SlotRestrictions LIKE '%$slot%'";
$result = mysql_query($query) or die('SQL error !<br>'.$query.'<br>'.mysql_error());

$output = "[";
while ($rs = mysql_fetch_array($result, MYSQL_ASSOC)) {
    if ($output != "[") {$output .= ",";}
    $output .= '{"MinLevel":' . $rs["MinLevel"] . ',';
    $output .= '"MaxLevel":' . $rs["MaxLevel"] . ',';
    $output .= '"Modifiers":"' . $rs["Modifiers"] . '",';
    $output .= '"MinMod":' . $rs["MinMod"] . ',';
    $output .= '"MaxMod":' . $rs["MaxMod"] . ',';
    $output .= '"Probas":' . $rs["Probas"] . '}';
}
$output .="]";

mysql_close();

echo($output);

?> 