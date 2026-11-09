<?php

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

$JSONdb = file_get_contents("Items.min.json");
$Langs = file_get_contents("Langs.min.json");
// transforms JSON data into associative arrays
$JSONdb = json_decode($JSONdb, true);
$Langs = json_decode($Langs, true);

// MySQL server connection
$db = mysql_connect('http://sql.free.fr/phpMyAdmin/', 'privateLogin', 'privatePassword');
// database selection
mysql_select_db('privateLogin',$db);
mysql_query("SET NAMES UTF8");

$tags = array(
	'essences','gems','companions',
	'amulets','waists','weapondecorations',
	'rings','headarmors','shoulders','torsos',
	'gloves','boots','mantles','sets','weapons','offhands','sysmess');

for ($x=0; $x < count($tags); $x++) {
	$section = $tags[$x];
	foreach ($Langs[$section] as $item) {
		$lid = $section . '_' . mysql_real_escape_string($item['langid']);
		$f = mysql_real_escape_string($item['fra']);
		$e = mysql_real_escape_string($item['eng']);
		$g = mysql_real_escape_string($item['deu']);
		$s = mysql_real_escape_string($item['esp']);
		$querystring = "INSERT INTO translations(langid, french, english, spanish, german) VALUES('$lid','$f','$e','$s','$g')";
		mysql_query($querystring) or die('Erreur SQL !<br>'.$querystring.'<br>'.mysql_error());
	}
}

foreach ($Langs['skills'] as $item) {
	$lidn = 'skills_name_' . mysql_real_escape_string($item['langid']);
	$fn = mysql_real_escape_string($item['name']['fra']);
	$en = mysql_real_escape_string($item['name']['eng']);
	$gn = mysql_real_escape_string($item['name']['deu']);
	$sn = mysql_real_escape_string($item['name']['esp']);
	$lidd = 'skills_description_' . mysql_real_escape_string($item['langid']);
	$fd = mysql_real_escape_string($item['description']['fra']);
	$ed = mysql_real_escape_string($item['description']['eng']);
	$gd = mysql_real_escape_string($item['description']['deu']);
	$sd = mysql_real_escape_string($item['description']['esp']);
	$querystringn = "INSERT INTO translations(langid, french, english, spanish, german) VALUES('$lidn','$fn','$en','$sn','$gn')";
	mysql_query($querystringn) or die('Erreur SQL !<br>'.$querystringn.'<br>'.mysql_error());
	$querystringd = "INSERT INTO translations(langid, french, english, spanish, german) VALUES('$lidd','$fd','$ed','$sd','$gd')";
	mysql_query($querystringd) or die('Erreur SQL !<br>'.$querystringd.'<br>'.mysql_error());
}

foreach ($Langs['talents'] as $item) {
	$lidn = 'talents_name_' . mysql_real_escape_string($item['langid']);
	$fn = mysql_real_escape_string($item['name']['fra']);
	$en = mysql_real_escape_string($item['name']['eng']);
	$gn = mysql_real_escape_string($item['name']['deu']);
	$sn = mysql_real_escape_string($item['name']['esp']);
	$lidd = 'talents_description_' . mysql_real_escape_string($item['langid']);
	$fd = mysql_real_escape_string($item['description']['fra']);
	$ed = mysql_real_escape_string($item['description']['eng']);
	$gd = mysql_real_escape_string($item['description']['deu']);
	$sd = mysql_real_escape_string($item['description']['esp']);
	$querystringn = "INSERT INTO translations(langid, french, english, spanish, german) VALUES('$lidn','$fn','$en','$sn','$gn')";
	mysql_query($querystringn) or die('Erreur SQL !<br>'.$querystringn.'<br>'.mysql_error());
	$querystringd = "INSERT INTO translations(langid, french, english, spanish, german) VALUES('$lidd','$fd','$ed','$sd','$gd')";
	mysql_query($querystringd) or die('Erreur SQL !<br>'.$querystringd.'<br>'.mysql_error());
}

foreach ($JSONdb['constants'] as $item) {
	$querystring = 'INSERT INTO constants(level, class, basehp, basedamage, blockrate, blockeddamage, accr) 
					VALUES('.$item['level'].',"WAR",'.$item['basehp']['WAR'].','.$item['basedmg']['WAR'].','.$item['blockrate'].','.$item['blockeddmg'].','.$item['accr'].')';
	mysql_query($querystring) or die('Erreur SQL !<br>'.$querystring.'<br>'.mysql_error());
	$querystring = 'INSERT INTO constants(level, class, basehp, basedamage, blockrate, blockeddamage, accr) 
					VALUES('.$item['level'].',"SW",'.$item['basehp']['SW'].','.$item['basedmg']['SW'].','.$item['blockrate'].','.$item['blockeddmg'].','.$item['accr'].')';
	mysql_query($querystring) or die('Erreur SQL !<br>'.$querystring.'<br>'.mysql_error());
	$querystring = 'INSERT INTO constants(level, class, basehp, basedamage, blockrate, blockeddamage, accr) 
					VALUES('.$item['level'].',"RNG",'.$item['basehp']['RNG'].','.$item['basedmg']['RNG'].','.$item['blockrate'].','.$item['blockeddmg'].','.$item['accr'].')';
	mysql_query($querystring) or die('Erreur SQL !<br>'.$querystring.'<br>'.mysql_error());
	$querystring = 'INSERT INTO constants(level, class, basehp, basedamage, blockrate, blockeddamage, accr) 
					VALUES('.$item['level'].',"DWF",'.$item['basehp']['DWF'].','.$item['basedmg']['DWF'].','.$item['blockrate'].','.$item['blockeddmg'].','.$item['accr'].')';
	mysql_query($querystring) or die('Erreur SQL !<br>'.$querystring.'<br>'.mysql_error());
}

foreach ($JSONdb['sets'] as $item) {
	$pc = str_replace(',','|',$item['setpieces']);
	$id = $item['id'];
	$lid = 'sets_'.$item['langid'];
	$bn = json_encode( $item['setbonus'] );
	$itemjobs = explode( ',',$item['job'] );
	for ($x=0; $x < count($itemjobs); $x++) {
		$jb = $itemjobs[$x];
		$querystring = "INSERT INTO sets(name, langid, class, pieces, bonuses) 
						VALUES('$id','$lid','$jb','$pc','$bn')";
		mysql_query($querystring) or die('Erreur SQL !<br>'.$querystring.'<br>'.mysql_error());
	}
}

foreach ($JSONdb['skills'] as $item) {
	$id = $item['id'];
	$name_lid = 'skills_name_'.$item['langid'];
	$desc_lid = 'skills_desc_'.$item['langid'];
	$jb = $item['job'];
	$otherfields = '';
	foreach ($item as $key=>$value) {
		if ($key != 'id' && $key != 'langid' && $key != 'job') {
			if (!strlen($otherfields)) $otherfields = $key .':'. $value;
			else $otherfields = $otherfields .';'. $key .':'. $value;
		}
	}
	$querystring = "INSERT INTO skills_talents(name, name_langid, desc_langid, class, otherfields) 
					VALUES('$id','$name_lid','$desc_lid','$jb','$otherfields')";
	mysql_query($querystring) or die('Erreur SQL !<br>'.$querystring.'<br>'.mysql_error());
}

foreach ($JSONdb['talents'] as $item) {
	$id = $item['id'];
	$name_lid = 'talents_name_'.$item['langid'];
	$desc_lid = 'talents_desc_'.$item['langid'];
	$jb = $item['job'];
	$otherfields = '';
	foreach ($item as $key=>$value) {
		if ($key != 'id' && $key != 'langid' && $key != 'job') {
			if (!strlen($otherfields)) $otherfields = $key .':'. $value;
			else $otherfields = $otherfields .';'. $key .':'. $value;
		}
	}
	$querystring = "INSERT INTO skills_talents(name, name_langid, desc_langid, class, otherfields) 
					VALUES('$id','$name_lid','$desc_lid','$jb','$otherfields')";
	mysql_query($querystring) or die('Erreur SQL !<br>'.$querystring.'<br>'.mysql_error());
}

$itemtags = array(
	'essences','gems','companions',
	'amulets','waists','weapondecorations',
	'rings','headarmors','shoulders','torsos',
	'gloves','boots','mantles','weapons','offhands');

for ($x=0; $x < count($itemtags); $x++) {
	$section = $itemtags[$x];
	foreach ($JSONdb[$section] as $item) {
		$id = $section . '_' . $item['id'];
		$lid = $section.'_'.$item['langid'];
		$otherfields = '';
		foreach ($item as $key=>$value) {
			if ($key != 'id' && $key != 'langid' && $key != 'job') {
				if (!strlen($otherfields)) $otherfields = $key .':'. $value;
				else $otherfields = $otherfields .';'. $key .':'. $value;
			}
		}
		if ( strlen($item['job'])<=3 ) {
			$jb = $item['job'];
			$querystring = "INSERT INTO items(name, class, langid, otherfields) 
							VALUES('$id','$jb','$lid','$otherfields')";
			mysql_query($querystring) or die('Erreur SQL !<br>'.$querystring.'<br>'.mysql_error());
		}
		else {
			$itemjobs = explode( ',',$item['job'] );
			for ($y=0; $y < count($itemjobs); $y++) {
				$jb = $itemjobs[$y];
				$querystring = "INSERT INTO items(name, class, langid, otherfields) 
								VALUES('$id','$jb','$lid','$otherfields')";
				mysql_query($querystring) or die('Erreur SQL !<br>'.$querystring.'<br>'.mysql_error());
			}
		}
	}
}

echo 'Vos infos on été ajoutées.';

mysql_close();

?>