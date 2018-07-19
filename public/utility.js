(function(){
 return utility ={
    states : ["Alabama", "Alaska","Arizona","Arkansas","California","Colorado",  "Connecticut",  "Delaware",  "Florida",  "Georgia",  "Hawaii",  "Idaho",  "Illinois","Indiana","Iowa","Kansas","Kentucky","Louisiana","Maine","Maryland","Massachusetts","Michigan","Minnesota","Mississippi","Missouri","Montana","Nebraska","Nevada","New Hampshire","New Jersey","New Mexico","New York","North Carolina","North Dakota","Ohio","Oklahoma","Oregon","Pennsylvania","Rhode Island","South Carolina","South Dakota","Tennessee","Texas","Utah","Vermont","Virginia","Washington","West Virginia","Wisconsin","Wyoming","District of Columbia","Puerto Rico","Guam","American Samoa","U.S. Virgin Islands","Northern Mariana Islands"
  ],
    heights :[
                {
                  "feet"  : "5’0”",
                  "cm" : 152.40
                },
                {
                  "feet"  : "5’1”",
                  "cm" : 154.94
                },
                {
                  "feet"  : "5’2”",
                  "cm" : 157.48
                },
                {
                  "feet"  : "5’3”",
                  "cm" : 160.02
                },
                {
                  "feet"  : "5’4”",
                  "cm" :  162.56
                },
                {
                  "feet"  : "5’5”",
                  "cm" : 165.10
                },
                {
                  "feet"  : "5’6”",
                  "cm" : 167.74
                },
                {
                  "feet"  : "5’7”",
                  "cm" : 170.18
                },
                {
                  "feet"  : "5’8”",
                  "cm" : 172.72
                },
                {
                  "feet"  : "5’9”",
                  "cm" : 175.26
                },
                {
                  "feet"  : "5’10”",
                  "cm" : 177.80
                },
                {
                  "feet"  : "5’11”",
                  "cm" : 180.34
                },
                {
                  "feet"  : "6’0”",
                  "cm" : 182.88
                },
                {
                  "feet"  : "6’1”",
                  "cm" : 185.45
                },
                {
                  "feet"  : "6’2”",
                  "cm" : 187.96
                },
                {
                  "feet"  : "6’3”",
                  "cm" : 190.50
                },
                {
                  "feet"  : "6’4”",
                  "cm" : 193.04
                },
                {
                  "feet"  : "6’5”",
                  "cm" : 195.58
                },
                {
                  "feet"  : "6’6”",
                  "cm" : 198.12
                },
                {
                  "feet"  : "6’7”",
                  "cm" : 200.66
                },
                {
                  "feet"  : "6’8”",
                  "cm" : 203.20
                },
                {
                  "feet"  : "6’9”",
                  "cm" : 205.74
                },
                {
                  "feet"  : "6’10”",
                  "cm" : 208.28
                },
                {
                  "feet"  : "6’11”",
                  "cm" : 210.82
                },
                {
                  "feet"  : "7’0”",
                  "cm" : 213.36
                },
                {
                  "feet"  : "7’1”",
                  "cm" : 215.90
                },
                {
                  "feet"  : "7’2”",
                  "cm" : 218.44
                },
              ],
   ethnicity:[
                  {"displayName":"African American","value":"african american"},
                  {"displayName":"Caucasian","value":"caucasian"},
                  {"displayName":"Asian","value":"asian"},
                  {"displayName":"Hispanic","value":"hispanic"},
                  {"displayName":"Indian","value":"indian"},
                  {"displayName":"Middle Eastern","value":"middle eastern"},
                  {"displayName":"Native American","value":"native american"},
                  // old values
                  //{"displayName":"American Indian","value":"american indian"},
                  //{"displayName":"Asian","value":"asian"},
                  //{"displayName":"Black","value":"black"},
                  //{"displayName":"white","value":"white"},
                ],
                gender:[

                  {"displayName":"Male","value":"Male"},
                  {"displayName":"Female","value":"Female"},
                  {"displayName":"Other","value":"other"},
                ],
                yes_no:[

                  {"displayName":"No","value":"No"},
                  {"displayName":"Yes","value":"Yes"},


                ],
                hair_color:[
                  {"displayName":"Black","value":"black"},
                  {"displayName":"White","value":"white"},
                  {"displayName":"Brown","value":"brown"},
                  {"displayName":"Gray","value":"gray"},
                  {"displayName":"Blonde","value":"blonde"},
                  {"displayName":"Bald","value":"bald"},
                  {"displayName":"Red","value":"red"},
                  {"displayName":"Sandy","value":"sandy"},
                  {"displayName":"Unknown","value":"unknown"},
                ],
                giveNoYesDropdown: function(id){
                   var selectBox = document.getElementById(id);
                   for(var i = 0; i<this.yes_no.length;  i++){
                   var yes_no = this.yes_no[i];
                    selectBox.options.add( new Option(yes_no.displayName, yes_no.value, yes_no.selected));
                   }
                 },
             giveHeightToDropdown: function giveHeightToDropdown(id){
                var selectBox = document.getElementById(id);
                for(var i = 0; i<this.heights.length;  i++){
                var height = this.heights[i];
                selectBox.options.add( new Option(height.feet, height.cm, height.selected));
                }
              },
              giveEtnicityToDropdown: function giveEtnicityToDropdown(id){
                 var selectBox = document.getElementById(id);
                 for(var i = 0; i<this.ethnicity.length;  i++){
                 var ethnicity = this.ethnicity[i];
                 selectBox.options.add( new Option(ethnicity.displayName, ethnicity.value, ethnicity.selected));
                 }
               },
               giveGenderToDropdown: function giveGenderToDropdown(id){
                  var selectBox = document.getElementById(id);
                  for(var i = 0; i<this.gender.length;  i++){
                  var gender = this.gender[i];
                  selectBox.options.add( new Option(gender.displayName, gender.value, gender.selected));
                  }
               },
               giveHairColorToDropdown: function giveGenderToDropdown(id){
                  var selectBox = document.getElementById(id);
                  for(var i = 0; i < this.hair_color.length; i++){
                    var hair_color = this.hair_color[i];
                    selectBox.options.add(new Option(hair_color.displayName, hair_color.value, hair_color.selected));
                  }
                },
                isValid:{
                 "string":function(value){if(parseInt(value)){return false;}else {return true;}},
               },

               options_field:{
                 sports: ["Basketball","Karate","Football","Baseball","Hockey","Soccer","Boxing","Tennis","Golf","Racing","Swimming","Volleyball"],
                 characteristics: ["Energetic", "Imaginative", "Intelligence","Charisma"],
                 dances: ["Ballet","Jazz","Tap"],
                 wardrobes: ["Hippie","Military","70s","80s","90s","cocktail Dresses","Formal Gown","Gothic","Halloween Costume"],
                 musicienship: ["Guitar","Piano","Flute"],
                 skills: ["Dancing","Singing","Sleeping"],
               },
 };

})();
