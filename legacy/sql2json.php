<?php
// Functions
if (!function_exists('json_decode')) {
    function json_decode($content, $assoc=false) {
        require_once 'JSONclass.php';
        if ($assoc) { $json = new Services_JSON(SERVICES_JSON_LOOSE_TYPE); }
        else { $json = new Services_JSON; }
        return $json->decode($content);
    }
}
if (!function_exists('json_encode')) {
   function json_encode($content) {
       require_once 'JSONclass.php';
       $json = new Services_JSON;
       return $json->encode($content);
   }
}
function walk($val,$key,$final) {
	$nums = explode(':', $val);
	if (is_numeric($nums[1])) {
		if (is_int($nums[1])) $nums[1] = (int)$nums[1];
		else $nums[1] = (float)$nums[1];
	}
	$final[$nums[0]] = $nums[1];
}

//POST parameters
$postdata = file_get_contents("php://input");
$request = json_decode($postdata);
$job = $request->job;
$lang = $request->lang;

if ($lang == 'fra') $lg = 'french';
elseif ($lang == 'eng') $lg = 'english';
elseif ($lang == 'deu') $lg = 'german';
elseif ($lang == 'esp') $lg = 'spanish';

// MySQL server connection
$db = mysql_connect('http://sql.free.fr/phpMyAdmin/', 'privateLogin', 'privatePassword');
// database selection
mysql_select_db('privateLogin',$db);
mysql_query("SET NAMES UTF8");

$response = array();

// =============================  CONSTANTS  =============================
$querystring = "SELECT c.level as level, c.basehp as basehp, c.basedamage as basedamage, c.blockrate as blockrate, c.blockeddamage as blockeddamage, c.accr as accr
				FROM `constants` c
				WHERE c.class = '$job'";
$queryresult = mysql_query($querystring) or die('Erreur SQL !<br>'.$querystring.'<br>'.mysql_error());

while ($row = mysql_fetch_array($queryresult, MYSQL_ASSOC)) {
	$response['constants'][$row['level']] = array(
			'basehp' => (int)$row['basehp'], 'basedmg' => (int)$row['basedamage'],
			'blockrate' => (float)$row['blockrate'], 'blockeddmg' => (float)$row['blockeddamage'], 'accr' => (float)$row['accr'] );
}

// =============================  SETS  =============================
$querystring = "SELECT s.name as name, t.$lg as translation, s.pieces as pieces, s.bonuses as bonuses
				FROM `sets` s 
				JOIN `translations` t on t.langid = s.langid
				WHERE s.class = '$job'";
$queryresult = mysql_query($querystring) or die('Erreur SQL !<br>'.$querystring.'<br>'.mysql_error());

while ($row = mysql_fetch_array($queryresult, MYSQL_ASSOC)) {
	$bonuses = explode('|', str_replace('},{','}|{',$row['bonuses']) );
	$finalbonuses = array();
	foreach ($bonuses as $item) {
		$partial = explode(',',str_replace('{','',str_replace('}','',$item)));
		$final = array();
		array_walk($partial,'walk',&$final);
		$finalbonuses[] = $final;
	}
	$response['sets'][$row['name']] = array( 'name' => $row['translation'], 'setpieces' => $row['pieces'], 'setbonus' => $finalbonuses );
}

// =============================  SKILLS & TALENTS  =============================
$querystring = "SELECT s.name as name, s.name_langid as lid, s.desc_langid, t1.$lg as name_translation, t2.$lg as desc_translation, s.otherfields as modifiers
				FROM `skills_talents` s
				JOIN `translations` t1 on t1.langid = s.name_langid
				JOIN `translations` t2 on t2.langid = s.desc_langid
				WHERE s.class = '$job'";
$queryresult = mysql_query($querystring) or die('Erreur SQL !<br>'.$querystring.'<br>'.mysql_error());

while ($row = mysql_fetch_array($queryresult, MYSQL_ASSOC)) {
	$section = substr($row['lid'],0,strpos($row['lid'],'_'));
	$partial = explode(';',$row['modifiers']);
	$final = array();
	array_walk($partial,'walk',&$final);
	$response[$section][$row['name']] = array_merge( array( 'name' => $row['name_translation'], 'description' => $row['desc_translation'] ) ,$final);
}

// =============================  ITEMS  =============================
$querystring = "SELECT i.name as name, t.$lg as translation, i.otherfields as modifiers
				FROM `items` i
				JOIN `translations` t on t.langid = i.langid
				WHERE i.class = '$job' OR i.class = ''";
$queryresult = mysql_query($querystring) or die('Erreur SQL !<br>'.$querystring.'<br>'.mysql_error());

while ($row = mysql_fetch_array($queryresult, MYSQL_ASSOC)) {
	$section = substr($row['name'],0,strpos($row['name'],'_'));
	$id = substr($row['name'],strpos($row['name'],'_')+1);
	$partial = explode(';',$row['modifiers']);
	$final = array();
	array_walk($partial,'walk',&$final);
	$response[$section][$id] = array_merge( array( 'name' => $row['translation'] ) ,$final);
}
$gemtemp = array();
foreach ($response['gems'] as $key=>$obj) {
	$obj['key'] = $key;
	$gemstemp[] = $obj;
}
function my_sort_function($a, $b) { return $a[key] > $b[key]; }
usort($gemstemp, 'my_sort_function');
$response['gems'] = $gemstemp;

// =============================  SYSMESS  =============================
$querystring = "SELECT t.langid as name, t.$lg as translation
				FROM `translations` t
				WHERE t.langid LIKE 'sysmess%'";
$queryresult = mysql_query($querystring) or die('Erreur SQL !<br>'.$querystring.'<br>'.mysql_error());

while ($row = mysql_fetch_array($queryresult, MYSQL_ASSOC)) {
	$id = substr($row['name'],strpos($row['name'],'_')+1);
	$response['sysmess'][$id] = $row['translation'];
}

// Affichage
/*reset($response);
while (list($key, $val) = each($response)) {
	echo "<br>===================================================================<br>
		  $key : Array (<br>";
	while (list($k1, $v1) = each($val)) {
		echo "<br><span style='margin-left:20px'>$k1 : Array (</span><br>";
		while (list($k2, $v2) = each($v1)) {
			if (!is_array($v2)) {
				$v2 = htmlentities($v2,ENT_QUOTES,"UTF-8");
				echo "<span style='margin-left:40px'>$k2 : $v2</span><br>";
			} else {
				echo "<span style='margin-left:40px'>$k2 : Array (</span><br>";
				foreach ($v2 as $item) {
					foreach ($item as $k3=>$v3) {
						echo "<span style='margin-left:60px'>$k3 : $v3</span>"; }
					echo "<br>";
				}
			}
		}
	}
} */

mysql_free_result($queryresult);

mysql_close();

echo json_encode($response);

?>